import hashlib
import uuid
from django.core import signing
from rest_framework.exceptions import ValidationError
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.db.models import F

from apps.common.logger import logger
from apps.notifications.models import Notification
from apps.notifications.utils import create_notification
from apps.tenants.models import TenantUsage

from .models import File, Request, RequestActivity
from .repositories import (DeliveryRepository, FileRepository,
                           InternalNoteRepository, RequestActivityRepository,
                           RequestRepository)
from .tasks import (categorise_request, generate_request_summary,
                    generate_triage_note)


# custom Exceptions
class RequestNotFound(Exception):
    pass


class RequestLimitExceeded(Exception):
    pass


class ForbiddenStatusTransition(Exception):
    pass


class RequestNotEditable(Exception):
    pass


class FileNotFound(Exception):
    pass


class S3PresignError(Exception):
    pass


class DeliveryNotFound(Exception):
    pass


class InvalidReviewAction(Exception):
    pass


VALID_TRANSITIONS = {
    Request.Status.RECEIVED: [Request.Status.IN_REVIEW, Request.Status.CLOSED],
    Request.Status.IN_REVIEW: [
        Request.Status.IN_PROGRESS,
        Request.Status.RECEIVED,
        Request.Status.CLOSED,
    ],
    Request.Status.IN_PROGRESS: [Request.Status.DELIVERED, Request.Status.IN_REVIEW],
    Request.Status.DELIVERED: [Request.Status.CLOSED, Request.Status.IN_PROGRESS],
    Request.Status.CLOSED: [],  # terminal
}


class RequestService:

    @staticmethod
    @transaction.atomic
    def create_request(tenant, client, provider, title, description):
        """Client submits a new request."""

        usage = TenantUsage.objects.select_for_update().get(tenant=tenant)

        plan = tenant.plan
        limit = plan.request_limit

        if limit != -1 and usage.active_request_count >= limit:
            raise RequestLimitExceeded(
                f"Active request limit of {limit} reached. "
                "Upgrade to Pro for unlimited requests."
            )

        request_obj = RequestRepository.create(
            tenant=tenant,
            client=client,
            provider=provider,
            title=title,
            description=description,
        )

        RequestActivityRepository.log(
            request_obj=request_obj,
            event_type=RequestActivity.EventType.REQUEST_CREATED,
            description=f"Request submitted by {client.client_name or 'client'}.",
            actor=client.user,
            actor_source=RequestActivity.ActorSource.USER,
        )

        TenantUsage.objects.filter(tenant=tenant).update(
            active_request_count=F("active_request_count") + 1,
            total_requests_lifetime=F("total_requests_lifetime") + 1,
        )

        cache.delete(f"dashboard_stats:{tenant.id}")
        cache.delete(f"sidebar_badges:{tenant.id}")

        def _notify_new_request():
            try:
                create_notification(
                    tenant=tenant,
                    recipient=provider,
                    event_type=Notification.EventType.NEW_REQUEST,
                    title=f"New request from {client.client_name or 'a client'}",
                    body=f'"{title}" was just submitted.',
                    related_request=request_obj,
                    related_client=client,
                )
            except Exception as e:
                logger.error(f"[create_request] Notification failed: {e}")

        def _trigger_ai_tasks():
            if not tenant.is_pro:
                return
            categorise_request.delay(str(request_obj.id))
            generate_request_summary.delay(str(request_obj.id))
            generate_triage_note.delay(str(request_obj.id))

        transaction.on_commit(_notify_new_request)
        transaction.on_commit(_trigger_ai_tasks)

        return request_obj

    @staticmethod
    @transaction.atomic
    def update_status(request_id, tenant, actor, new_status):
        """Provider moves a request through the pipeline."""

        request_obj = RequestRepository.get_by_id(request_id, tenant.id)
        if not request_obj:
            raise RequestNotFound("Request not found.")

        current = request_obj.status
        allowed = VALID_TRANSITIONS.get(current, [])

        if new_status not in allowed:
            raise ForbiddenStatusTransition(
                f"Cannot move from '{current}' to '{new_status}'."
            )

        old_status = current
        RequestRepository.update_status(request_obj, new_status)

        RequestActivityRepository.log(
            request_obj=request_obj,
            event_type=RequestActivity.EventType.STATUS_CHANGE,
            description=f"Status changed from '{old_status}' to '{new_status}'.",
            actor=actor,
            actor_source=RequestActivity.ActorSource.USER,
            metadata={"from": old_status, "to": new_status},
        )

        # Decrement active count when closed or delivered
        if new_status in [Request.Status.CLOSED, Request.Status.DELIVERED]:
            TenantUsage.objects.filter(
                tenant=tenant, active_request_count__gt=0
            ).update(active_request_count=F("active_request_count") - 1)

        # Increment delivered count
        if new_status == Request.Status.DELIVERED:
            TenantUsage.objects.filter(tenant=tenant).update(
                total_delivered_lifetime=F("total_delivered_lifetime") + 1
            )

        # Restore active count if coming back from closed/delivered
        if old_status in [
            Request.Status.CLOSED,
            Request.Status.DELIVERED,
        ] and new_status not in [Request.Status.CLOSED, Request.Status.DELIVERED]:
            TenantUsage.objects.filter(tenant=tenant).update(
                active_request_count=F("active_request_count") + 1
            )

        cache.delete(f"dashboard_stats:{tenant.id}")
        cache.delete(f"sidebar_badges:{tenant.id}")

        def _notify_status_change():
            try:
                client_user = request_obj.client.user
                if client_user and client_user != actor:
                    create_notification(
                        tenant=tenant,
                        recipient=client_user,
                        event_type=Notification.EventType.STATUS_CHANGE,
                        title=f'"{request_obj.title}" is now {new_status.replace("_", " ").title()}',
                        body=f'{old_status.replace("_", " ").title()} → {new_status.replace("_", " ").title()}',
                        related_request=request_obj,
                        related_client=request_obj.client,
                        new_status=new_status,
                    )
            except Exception as e:
                logger.error(f"[update_status] Notification failed: {e}")

        transaction.on_commit(_notify_status_change)

        return request_obj

    @staticmethod
    @transaction.atomic
    def edit_request(request_id, tenant, client_id, title=None, description=None):
        """Client can edit only while status is RECEIVED."""

        request_obj = RequestRepository.get_by_id_for_client(
            request_id, tenant.id, client_id
        )

        if not request_obj:
            raise RequestNotFound("Request not found.")

        if request_obj.status != Request.Status.RECEIVED:
            raise RequestNotEditable(
                "Request can no longer be edited once it has been reviewed."
            )

        RequestRepository.update_content(
            request_obj, title=title, description=description
        )
        return request_obj

    @staticmethod
    def set_urgent(request_id, tenant, actor, is_urgent):
        request_obj = RequestRepository.get_by_id(request_id, tenant.id)

        if not request_obj:
            raise RequestNotFound("Request not found.")

        RequestRepository.set_urgent(request_obj, is_urgent)

        RequestActivityRepository.log(
            request_obj=request_obj,
            event_type=RequestActivity.EventType.STATUS_CHANGE,
            description=f"Request {'flagged as urgent' if is_urgent else 'unflagged'}.",
            actor=actor,
            actor_source=RequestActivity.ActorSource.USER,
            metadata={"is_urgent": is_urgent},
        )
        return request_obj

    @staticmethod
    def set_due_date(request_id, tenant, actor, due_date):
        request_obj = RequestRepository.get_by_id(request_id, tenant.id)
        if not request_obj:
            raise RequestNotFound("Request not found.")
        RequestRepository.set_due_date(request_obj, due_date)
        return request_obj

    @staticmethod
    @transaction.atomic
    def add_internal_note(request_id, tenant, user, content):
        request_obj = RequestRepository.get_by_id(request_id, tenant.id)
        if not request_obj:
            raise RequestNotFound("Request not found.")

        note = InternalNoteRepository.create(
            request_obj=request_obj,
            user=user,
            content=content,
        )

        RequestActivityRepository.log(
            request_obj=request_obj,
            event_type=RequestActivity.EventType.NOTE_ADDED,
            description="Internal note added.",
            actor=user,
            actor_source=RequestActivity.ActorSource.USER,
        )

        return note

    @staticmethod
    @transaction.atomic
    def create_delivery(
        request_id, tenant, provider, message=None, links=None, file_ids=None
    ):
        """
        Provider delivers a request.
        file_ids = list of File UUIDs already uploaded via the presigned-URL flow.
        """
        request_obj = RequestRepository.get_by_id(request_id, tenant.id)
        if not request_obj:
            raise RequestNotFound("Request not found.")

        delivery = DeliveryRepository.create(
            request_obj=request_obj,
            created_by=provider,
            message=message,
            links=links,
        )

        # Attach previously uploaded files to this delivery
        if file_ids:
            files = File.objects.filter(
                id__in=file_ids,
                tenant=tenant,
                request=request_obj,
                is_deleted=False,
            )
            files.update(delivery=delivery, is_delivery_file=True)

        old_status = request_obj.status
        RequestRepository.update_status(request_obj, Request.Status.DELIVERED)

        RequestActivityRepository.log(
            request_obj=request_obj,
            event_type=RequestActivity.EventType.STATUS_CHANGE,
            description=f"Status changed from '{old_status}' to 'delivered'.",
            actor=provider,
            actor_source=RequestActivity.ActorSource.USER,
            metadata={"from": old_status, "to": Request.Status.DELIVERED},
        )

        TenantUsage.objects.filter(tenant=tenant, active_request_count__gt=0).update(
            active_request_count=F("active_request_count") - 1,
            total_delivered_lifetime=F("total_delivered_lifetime") + 1,
        )

        cache.delete(f"dashboard_stats:{tenant.id}")
        cache.delete(f"sidebar_badges:{tenant.id}")

        RequestActivityRepository.log(
            request_obj=request_obj,
            event_type=RequestActivity.EventType.DELIVERY_CREATED,
            description=f"Delivery #{delivery.delivery_number} created.",
            actor=provider,
            actor_source=RequestActivity.ActorSource.USER,
            metadata={"delivery_id": str(delivery.id)},
        )

        def _notify_delivery():
            try:
                client_user = request_obj.client.user
                if client_user:
                    create_notification(
                        tenant=tenant,
                        recipient=client_user,
                        event_type=Notification.EventType.FILES_DELIVERED,
                        title="Your delivery is ready",
                        body=f'Delivery #{delivery.delivery_number} for "{request_obj.title}" is available.',
                        related_request=request_obj,
                        related_client=request_obj.client,
                        new_status="delivered",
                    )
            except Exception as e:
                logger.error(f"[create_delivery] Notification failed: {e}")

        transaction.on_commit(_notify_delivery)

        return delivery

    @staticmethod
    @transaction.atomic
    def review_delivery(request_id, delivery_id, tenant, client, action, message=None):
        """
        Client approves or requests rework on a delivered request.
        approve  → status becomes closed
        rework   → status becomes in_progress
        """

        request_obj = RequestRepository.get_by_id_for_client(
            request_id, tenant.id, client.id
        )
        if not request_obj:
            raise RequestNotFound("Request not found.")

        if request_obj.status != Request.Status.DELIVERED:
            raise ForbiddenStatusTransition("Only delivered requests can be reviewed.")

        delivery = DeliveryRepository.get_by_id(delivery_id, request_id, tenant.id)
        if not delivery:
            raise DeliveryNotFound("Delivery not found")

        if action == "approve":
            new_status = Request.Status.CLOSED
            event_type = RequestActivity.EventType.STATUS_CHANGE
            activity_description = "Client approved the delivery. Request closed."
        else:
            new_status = Request.Status.IN_PROGRESS
            event_type = RequestActivity.EventType.STATUS_CHANGE
            activity_description = (
                f"Client requested rework. Message: {message}"
                if message
                else "Client requested rework."
            )

        old_status = request_obj.status
        RequestRepository.update_status(request_obj, new_status)

        RequestActivityRepository.log(
            request_obj=request_obj,
            event_type=event_type,
            description=activity_description,
            actor=client.user,
            actor_source=RequestActivity.ActorSource.USER,
            metadata={
                "from": old_status,
                "to": new_status,
                "delivery_id": str(delivery_id),
                "action": action,
                **({"rework_message": message} if message else {}),
            },
        )

        if new_status == Request.Status.CLOSED:
            TenantUsage.objects.filter(tenant=tenant).update(
                total_delivered_lifetime=F("total_delivered_lifetime") + 1
            )
            TenantUsage.objects.filter(
                tenant=tenant, active_request_count__gt=0
            ).update(active_request_count=F("active_request_count") - 1)

        if new_status == Request.Status.IN_PROGRESS:
            TenantUsage.objects.filter(tenant=tenant).update(
                active_request_count=F("active_request_count") + 1
            )

        def _notify_review():
            try:
                provider_user = request_obj.provider
                action_label = (
                    "approved the delivery"
                    if action == "approve"
                    else "requested rework"
                )
                create_notification(
                    tenant=tenant,
                    recipient=provider_user,
                    event_type=Notification.EventType.STATUS_CHANGE,
                    title=f'{client.client_name or "Client"} {action_label} on "{request_obj.title}"',
                    body=f'{old_status.replace("_", " ").title()} → {new_status.replace("_", " ").title()}',
                    related_request=request_obj,
                    related_client=client,
                )
            except Exception as e:
                logger.error(f"[review_delivery] Notification failed: {e}")

        transaction.on_commit(_notify_review)

        cache.delete(f"dashboard_stats:{tenant.id}")
        cache.delete(f"sidebar_badges:{tenant.id}")

        return request_obj


class FileService:

    @staticmethod
    def generate_presigned_upload_url(
        tenant_id, request_id, file_name, file_type, uploaded_by_id
    ):
        """
        Returns a presigned S3 POST URL.
        """

        s3 = boto3.client(
            "s3",
            region_name=settings.AWS_S3_REGION_NAME,
            endpoint_url=f"https://s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "virtual"},
            ),
        )

        extension = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
        upload = signing.dumps({
            "tenant": str(tenant_id), "request": str(request_id),
            "user": str(uploaded_by_id), "type": file_type,
            "name": hashlib.sha256(file_name.encode()).hexdigest(),
            "nonce": uuid.uuid4().hex,
        }, salt="file-upload", compress=True)
        s3_key = f"tenants/{tenant_id}/requests/{request_id}/{upload}"

        try:
            presigned = s3.generate_presigned_post(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=s3_key,
                Fields={"Content-Type": file_type},
                Conditions=[
                    {"Content-Type": file_type},
                    ["content-length-range", 1, 50 * 1024 * 1024],  # max 50 MB
                ],
                ExpiresIn=300,  # 5 minutes
            )
        except ClientError as e:
            raise S3PresignError(f"Could not generate upload URL: {e}")
        return {
            "upload_url": presigned["url"],
            "fields": presigned["fields"],
            "s3_key": s3_key,
            "extension": extension,
        }

    @staticmethod
    def confirm_upload(
        tenant, request_id, uploaded_by, file_name, s3_key, file_size_bytes, file_type
    ):
        """
        Called by the frontend after a successful S3 upload.
        Creates the File record pointing at the now-live S3 object.
        """
        request_obj = RequestRepository.get_by_id(request_id, tenant.id)
        if not request_obj:
            raise RequestNotFound("Request not found.")

        prefix = f"tenants/{tenant.id}/requests/{request_id}/"
        try:
            if not s3_key.startswith(prefix):
                raise signing.BadSignature("Wrong request")
            upload = signing.loads(s3_key[len(prefix):], salt="file-upload", max_age=900)
            expected = {"tenant": str(tenant.id), "request": str(request_id),
                        "user": str(uploaded_by.id), "type": file_type,
                        "name": hashlib.sha256(file_name.encode()).hexdigest()}
            if any(upload.get(key) != value for key, value in expected.items()):
                raise signing.BadSignature("Upload details changed")
        except (signing.BadSignature, ValueError, TypeError):
            raise ValidationError("Invalid or expired upload. Request a new upload URL.")

        s3 = boto3.client("s3", region_name=settings.AWS_S3_REGION_NAME,
                          aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                          aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY)
        try:
            metadata = s3.head_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=s3_key)
        except ClientError:
            raise ValidationError("Uploaded object could not be verified.")
        if (metadata["ContentLength"] != file_size_bytes
                or not 0 < file_size_bytes <= 50 * 1024 * 1024
                or metadata.get("ContentType") != file_type):
            raise ValidationError("Uploaded object does not match the supplied details.")

        existing = File.objects.filter(tenant=tenant, request=request_obj,
                                       s3_key=s3_key, is_deleted=False).first()
        if existing:
            return existing
        extension = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
        file_url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{s3_key}"

        file_obj = FileRepository.create(
            tenant=tenant,
            request_obj=request_obj,
            uploaded_by=uploaded_by,
            file_name=file_name,
            s3_key=s3_key,
            file_url=file_url,
            file_size_bytes=file_size_bytes,
            file_type=file_type,
            file_extension=extension,
        )

        RequestActivityRepository.log(
            request_obj=request_obj,
            event_type=RequestActivity.EventType.FILE_UPLOADED,
            description=f"File '{file_name}' uploaded.",
            actor=uploaded_by,
            actor_source=RequestActivity.ActorSource.USER,
            metadata={"file_id": str(file_obj.id), "file_name": file_name},
        )

        return file_obj

    @staticmethod
    def generate_download_url(s3_key):

        if not s3_key:
            return None

        s3 = boto3.client(
            "s3",
            region_name=settings.AWS_S3_REGION_NAME,
            endpoint_url=f"https://s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "virtual"},
            ),
        )

        return s3.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
                "Key": s3_key,
            },
            ExpiresIn=300,
        )
