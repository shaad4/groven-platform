from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from apps.common.logger import logger
from apps.notifications.utils import push_activity

from .models import Delivery, File, InternalNote, Request, RequestActivity


class RequestRepository:

    @staticmethod
    def get_all_for_provider(tenant_id, filter=None):
        """
        Unified inbox — all non-deleted requests for a tenant.
        filters dict keys: client_id, status, date_from, date_to, is_urgent, ai_category
        sort keys: newest (default), oldest, last_updated
        """

        qs = (
            Request.objects.filter(
                tenant_id=tenant_id, is_deleted=False, client__is_deleted=False
            )
            .select_related("client__user", "provider")
            .annotate(active_file_count=Count("files", filter=Q(files__is_deleted=False)))
            .order_by("-created_at")
        )

        if not filter:
            return qs

        if filter.get("client_id"):
            qs = qs.filter(client_id=filter["client_id"])

        if filter.get("status"):
            qs = qs.filter(status=filter["status"])

        if filter.get("is_urgent") is not None:
            qs = qs.filter(is_urgent=filter["is_urgent"])

        if filter.get("ai_category"):
            qs = qs.filter(ai_category=filter["ai_category"])

        if filter.get("date_from"):
            qs = qs.filter(created_at__date__gte=filter["date_from"])

        if filter.get("date_to"):
            qs = qs.filter(created_at__date__lte=filter["date_to"])

        sort = filter.get("sort", "newest")
        if sort == "oldest":
            qs = qs.order_by("created_at")
        elif sort == "last_updated":
            qs = qs.order_by("-updated_at")
        else:
            qs = qs.order_by("-created_at")

        return qs

    @staticmethod
    def get_all_for_client(tenant_id, client_id, filter=None):
        """Client sees only their own requests."""

        qs = (
            Request.objects.filter(
                tenant_id=tenant_id, client_id=client_id, is_deleted=False
            )
            .select_related("client__user", "provider")
            .annotate(active_file_count=Count("files", filter=Q(files__is_deleted=False)))
            .order_by("-created_at")
        )

        if not filter:
            return qs

        if filter.get("status"):
            qs = qs.filter(status=filter["status"])

        sort = filter.get("sort", "newest")
        if sort == "oldest":
            qs = qs.order_by("created_at")
        else:
            qs = qs.order_by("-created_at")

        return qs

    @staticmethod
    def get_by_id(request_id, tenant_id):
        return (
            Request.objects.filter(id=request_id, tenant_id=tenant_id, is_deleted=False)
            .select_related("client__user", "provider")
            .prefetch_related("files", "deliveries__files")
            .first()
        )

    @staticmethod
    def get_by_id_for_client(request_id, tenant_id, client_id):
        return (
            Request.objects.filter(
                id=request_id,
                tenant_id=tenant_id,
                client_id=client_id,
                is_deleted=False,
            )
            .select_related("client__user", "provider")
            .prefetch_related("files", "deliveries__files")
            .first()
        )

    @staticmethod
    def create(tenant, client, provider, title, description):
        return Request.objects.create(
            tenant=tenant,
            client=client,
            provider=provider,
            title=title,
            description=description,
        )

    @staticmethod
    def update_status(request_obj, new_status):
        request_obj.status = new_status
        request_obj.save(update_fields=["status", "updated_at"])

        return request_obj

    @staticmethod
    def update_content(request_obj, title=None, description=None):
        """Client edit — only allowed while status is received."""

        if title is not None:
            request_obj.title = title
        if description is not None:
            request_obj.description = description

        request_obj.save(update_fields=["title", "description", "updated_at"])

        return request_obj

    @staticmethod
    def set_urgent(request_obj, is_urgent):
        request_obj.is_urgent = is_urgent
        request_obj.save(update_fields=["is_urgent", "updated_at"])

        return request_obj

    @staticmethod
    def set_due_date(request_obj, due_date):
        request_obj.due_date = due_date
        request_obj.save(update_fields=["due_date", "updated_at"])

    @staticmethod
    def soft_delete(request_obj):
        request_obj.is_deleted = True
        request_obj.deleted_at = timezone.now()
        request_obj.save(update_fields=["is_deleted", "deleted_at", "updated_at"])
        return request_obj

    @staticmethod
    def get_open_count_for_client(client_id, tenant_id):
        return (
            Request.objects.filter(
                client_id=client_id,
                tenant_id=tenant_id,
                is_deleted=False,
            )
            .exclude(status__in=[Request.Status.DELIVERED, Request.Status.CLOSED])
            .count()
        )

    @staticmethod
    def get_delivered_count_for_client(client_id, tenant_id):
        return Request.objects.filter(
            client_id=client_id,
            tenant_id=tenant_id,
            is_deleted=False,
            status=Request.Status.DELIVERED,
        ).count()


class RequestActivityRepository:

    @staticmethod
    def log(
        request_obj,
        event_type,
        description,
        actor=None,
        actor_source=RequestActivity.ActorSource.USER,
        metadata=None,
    ):

        activity = RequestActivity.objects.create(
            request=request_obj,
            tenant=request_obj.tenant,
            actor=actor,
            actor_source=actor_source,
            event_type=event_type,
            description=description,
            metadata=metadata,
        )

        try:
            transaction.on_commit(lambda: push_activity(
                activity=activity,
                provider_id=request_obj.provider_id,
            ))
        except Exception as e:
            logger.error(f"[RequestActivityRepository.log] push_activity failed: {e}")

        return activity

    @staticmethod
    def get_for_request(request_id, tenant_id):
        return (
            RequestActivity.objects.filter(request_id=request_id, tenant_id=tenant_id)
            .select_related("actor")
            .order_by("created_at")
        )


class InternalNoteRepository:

    @staticmethod
    def create(request_obj, user, content, is_ai_generated=False):
        return InternalNote.objects.create(
            request=request_obj,
            tenant=request_obj.tenant,
            user=user,
            content=content,
            is_ai_generated=is_ai_generated,
        )

    @staticmethod
    def get_for_request(request_id, tenant_id):
        return (
            InternalNote.objects.filter(request_id=request_id, tenant_id=tenant_id)
            .select_related("user")
            .order_by("created_at")
        )


class DeliveryRepository:

    @staticmethod
    def get_next_delivery_number(request_id):
        last = (
            Delivery.objects.filter(request_id=request_id)
            .order_by("-delivery_number")
            .values_list("delivery_number", flat=True)
            .first()
        )
        return (last or 0) + 1

    @staticmethod
    def create(request_obj, created_by, message=None, links=None):
        number = DeliveryRepository.get_next_delivery_number(request_obj.id)
        return Delivery.objects.create(
            request=request_obj,
            tenant=request_obj.tenant,
            created_by=created_by,
            message=message,
            links=links,
            delivery_number=number,
        )

    @staticmethod
    def get_for_request(request_id):
        return (
            Delivery.objects.filter(request_id=request_id)
            .prefetch_related("files")
            .order_by("delivery_number")
        )

    @staticmethod
    def get_by_id(delivery_id, request_id, tenant_id):
        return (
            Delivery.objects.filter(
                id=delivery_id, request_id=request_id, tenant_id=tenant_id
            )
            .prefetch_related("files")
            .first()
        )


class FileRepository:

    @staticmethod
    def create(
        tenant,
        request_obj,
        uploaded_by,
        file_name,
        file_url,
        s3_key,
        file_size_bytes,
        file_type,
        file_extension,
        delivery=None,
        is_delivery_file=False,
        upload_id=None,
    ):

        return File.objects.create(
            tenant=tenant,
            request=request_obj,
            uploaded_by=uploaded_by,
            file_name=file_name,
            file_url=file_url,
            s3_key=s3_key,
            upload_id=upload_id,
            file_size_bytes=file_size_bytes,
            file_type=file_type,
            file_extension=file_extension,
            delivery=delivery,
            is_delivery_file=is_delivery_file,
        )

    @staticmethod
    def get_for_request(request_id, tenant_id, delivery_files_only=False):
        qs = File.objects.filter(
            request_id=request_id,
            tenant_id=tenant_id,
            is_deleted=False,
        )
        if delivery_files_only:
            qs = qs.filter(is_delivery_file=True)
        return qs.order_by("created_at")

    @staticmethod
    def get_by_id(file_id, tenant_id):
        return File.objects.filter(
            id=file_id, tenant_id=tenant_id, is_deleted=False
        ).first()

    @staticmethod
    def soft_delete(file_obj):
        file_obj.is_deleted = True
        file_obj.deleted_at = timezone.now()
        file_obj.save(update_fields=["is_deleted", "deleted_at"])

        return file_obj
