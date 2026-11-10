from django.shortcuts import render
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.models import Client
from apps.common.ai.client import AIService
from apps.common.ai.exceptions import AIRateLimitError, AIServiceError
from apps.tenants.models import TenantMembership

from .models import Request
from .repositories import (DeliveryRepository, FileRepository,
                           InternalNoteRepository, RequestActivityRepository,
                           RequestRepository)
from .serializers import (AddNoteSerializer, ConfirmUploadSerializer,
                          CreateDeliverySerializer, CreateRequestSerializer,
                          DeliveryReviewSerializer, DeliverySerializer,
                          FileSerializer, InternalNoteSerializer,
                          PresignedUploadSerializer, RequestActivitySerializer,
                          RequestDetailSerializer, RequestListSerializer,
                          SetDueDateSerializer, SetUrgentSerializer,
                          UpdateRequestSerializer, UpdateStatusSerializer)
from .services import (DeliveryNotFound, FileService,
                       ForbiddenStatusTransition, InvalidReviewAction,
                       RequestLimitExceeded, RequestNotEditable,
                       RequestNotFound, RequestService, S3PresignError)
from .tasks import generate_request_summary

# Create your views here.






def _is_provider(request):
    m = getattr(request, "tenant_membership", None)
    return m is not None and m.role == TenantMembership.Role.PROVIDER


def _is_client(request):
    m = getattr(request, "tenant_membership", None)
    return m is not None and m.role == TenantMembership.Role.CLIENT


def _get_client_profile(request):
    """Return the Client row for the current user in this tenant, or None"""
    try:
        return Client.objects.get(
            user=request.user,
            tenant=request.tenant,
            is_deleted=False,
        )
    except Client.DoesNotExist:
        return None


# request list + create API
class RequestListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = request.tenant

        # Build filter dict from query params
        filters = {
            "client_id": request.query_params.get("client_id"),
            "status": request.query_params.get("status"),
            "is_urgent": request.query_params.get("is_urgent"),
            "ai_category": request.query_params.get("ai_category"),
            "date_from": request.query_params.get("date_from"),
            "date_to": request.query_params.get("date_to"),
            "sort": request.query_params.get("sort", "newest"),
        }

        if filters["is_urgent"] == "true":
            filters["is_urgent"] = True
        elif filters["is_urgent"] == "false":
            filters["is_urgent"] = False
        else:
            filters["is_urgent"] = None

        filters = {k: v for k, v in filters.items() if v is not None}

        if _is_provider(request):
            qs = RequestRepository.get_all_for_provider(tenant.id, filters)

        elif _is_client(request):
            client = _get_client_profile(request)
            if not client:
                return Response(
                    {"success": False, "message": "Client profile not found."},
                    status=404,
                )

            qs = RequestRepository.get_all_for_client(tenant.id, client.id, filters)

        else:
            return Response({"success": False, "message": "Forbidden."}, status=403)

        serializer = RequestListSerializer(qs, many=True)
        return Response(
            {
                "success": True,
                "data": {
                    "requests": serializer.data,
                    "total": qs.count(),
                },
            }
        )

    def post(self, request):
        """Only clients can submit requests"""

        if not _is_client(request):
            return Response(
                {"success": False, "message": "Only clients can submit requests."},
                status=403,
            )

        client = _get_client_profile(request)
        if not client:
            return Response(
                {"success": False, "message": "Client profile not found."}, status=404
            )

        if client.is_deactivated:
            return Response(
                {"success": False, "message": "Your access has been deactivated."},
                status=403,
            )

        serializer = CreateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            req = RequestService.create_request(
                tenant=request.tenant,
                client=client,
                provider=client.provider,
                title=serializer.validated_data["title"],
                description=serializer.validated_data["description"],
            )
        except RequestLimitExceeded as e:
            return Response(
                {
                    "success": False,
                    "error_type": "limit_reached",
                    "message": str(e),
                },
                status=403,
            )

        return Response(
            {
                "success": True,
                "message": "Request submitted.",
                "data": RequestDetailSerializer(req).data,
            },
            status=status.HTTP_201_CREATED,
        )


# Request Detail API
class RequestDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_request_for_user(self, request, request_id):
        tenant = request.tenant
        if _is_provider(request):
            return RequestRepository.get_by_id(request_id, tenant.id)
        elif _is_client(request):
            client = _get_client_profile(request)
            if not client:
                return None
            return RequestRepository.get_by_id_for_client(
                request_id, tenant.id, client.id
            )
        return None

    def get(self, request, request_id):
        req = self._get_request_for_user(request, request_id)

        if not req:
            return Response(
                {"success": False, "message": "Request not found."}, status=404
            )

        return Response({"success": True, "data": RequestDetailSerializer(req).data})

    def patch(self, request, request_id):
        """Client edits their own request (title/description, only while received)."""

        if not _is_client(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)

        client = _get_client_profile(request)
        if not client:
            return Response(
                {"success": False, "message": "Client profile not found."}, status=404
            )

        serializer = UpdateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            req = RequestService.edit_request(
                request_id=request_id,
                tenant=request.tenant,
                client_id=client.id,
                title=serializer.validated_data.get("title"),
                description=serializer.validated_data.get("description"),
            )
        except RequestNotFound as e:
            return Response({"success": False, "message": str(e)}, status=404)
        except RequestNotEditable as e:
            return Response({"success": False, "message": str(e)}, status=409)

        return Response(
            {
                "success": True,
                "message": "Request updated.",
                "data": RequestDetailSerializer(req).data,
            }
        )


# Status update API - provider only


class RequestStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, request_id):
        if not _is_provider(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)

        serializer = UpdateStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            req = RequestService.update_status(
                request_id=request_id,
                tenant=request.tenant,
                actor=request.user,
                new_status=serializer.validated_data["status"],
            )
        except RequestNotFound as e:
            return Response({"success": False, "message": str(e)}, status=404)
        except ForbiddenStatusTransition as e:
            return Response({"success": False, "message": str(e)}, status=409)

        return Response(
            {
                "success": True,
                "message": f"Status updated to '{req.status}'.",
                "data": RequestDetailSerializer(req).data,
            }
        )


# urgent flag API - provider only
class RequestFlagView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, request_id):
        if not _is_provider(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)

        serializer = SetUrgentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            req = RequestService.set_urgent(
                request_id=request_id,
                tenant=request.tenant,
                actor=request.user,
                is_urgent=serializer.validated_data["is_urgent"],
            )
        except RequestNotFound as e:
            return Response({"success": False, "message": str(e)}, status=404)

        return Response(
            {
                "success": True,
                "message": "Request flag updated.",
                "data": {"is_urgent": req.is_urgent},
            }
        )


# Due Date API - provider


class RequestDueDateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, request_id):
        if not _is_provider(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)

        serializer = SetDueDateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            req = RequestService.set_due_date(
                request_id=request_id,
                tenant=request.tenant,
                actor=request.user,
                due_date=serializer.validated_data["due_date"],
            )
        except RequestNotFound as e:
            return Response({"success": False, "message": str(e)}, status=404)

        return Response(
            {
                "success": True,
                "message": "Due date updated.",
                "data": {"due_date": req.due_date},
            }
        )


# Activit Log API


class RequestActivityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, request_id):
        tenant = request.tenant

        if _is_client(request):
            client = _get_client_profile(request)
            if not client:
                return Response(
                    {"success": False, "message": "Client profile not found."},
                    status=404,
                )

            req = RequestRepository.get_by_id_for_client(
                request_id, tenant.id, client.id
            )

        elif _is_provider(request):
            req = RequestRepository.get_by_id(request_id, tenant.id)

        else:
            return Response({"success": False, "message": "Forbidden."}, status=403)

        if not req:
            return Response(
                {"success": False, "message": "Request not found."}, status=404
            )

        activities = RequestActivityRepository.get_for_request(request_id, tenant.id)
        return Response(
            {
                "success": True,
                "data": RequestActivitySerializer(activities, many=True).data,
            }
        )


# Internal Notes API - Provider


class InternalNoteView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, request_id):
        if not _is_provider(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)

        req = RequestRepository.get_by_id(request_id, request.tenant.id)

        if not req:
            return Response(
                {"success": False, "message": "Request not found."}, status=404
            )

        notes = InternalNoteRepository.get_for_request(request_id, request.tenant.id)
        return Response(
            {"success": True, "data": InternalNoteSerializer(notes, many=True).data}
        )

    def post(self, request, request_id):
        if not _is_provider(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)

        serializer = AddNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            note = RequestService.add_internal_note(
                request_id=request_id,
                tenant=request.tenant,
                user=request.user,
                content=serializer.validated_data["content"],
            )
        except RequestNotFound as e:
            return Response({"success": False, "message": str(e)}, status=404)

        return Response(
            {
                "success": True,
                "message": "Note added.",
                "data": InternalNoteSerializer(note).data,
            },
            status=status.HTTP_201_CREATED,
        )


# delivery API


class DeliveryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, request_id):
        tenant = request.tenant

        if _is_client(request):
            client = _get_client_profile(request)

            if not client:
                return Response(
                    {"success": False, "message": "Client profile not found."},
                    status=404,
                )

            req = RequestRepository.get_by_id_for_client(
                request_id, tenant.id, client.id
            )

        elif _is_provider(request):
            req = RequestRepository.get_by_id(request_id, tenant.id)

        else:
            return Response({"success": False, "message": "Forbidden."}, status=403)

        if not req:
            return Response(
                {"success": False, "message": "Request not found."}, status=404
            )

        deliveries = DeliveryRepository.get_for_request(request_id)

        return Response(
            {"success": True, "data": DeliverySerializer(deliveries, many=True).data}
        )

    def post(self, request, request_id):
        """Provider creates a delivery."""

        if not _is_provider(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)

        serializer = CreateDeliverySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            delivery = RequestService.create_delivery(
                request_id=request_id,
                tenant=request.tenant,
                provider=request.user,
                message=serializer.validated_data.get("message"),
                links=serializer.validated_data.get("links"),
                file_ids=serializer.validated_data.get("file_ids"),
            )
        except RequestNotFound as e:
            return Response({"success": False, "message": str(e)}, status=404)

        return Response(
            {
                "success": True,
                "message": "Delivery created.",
                "data": DeliverySerializer(delivery).data,
            },
            status=status.HTTP_201_CREATED,
        )


# File Upload - presigned URL Flow


class PresignedUploadView(APIView):
    """
    Step 1 of file upload.
    Returns a presigned S3 POST URL. Frontend uploads directly to S3.
    Then calls ConfirmUploadView to register the file in the DB.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not (_is_provider(request) or _is_client(request)):
            return Response({"success": False, "message": "Forbidden."}, status=403)

        serializer = PresignedUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        request_id = serializer.validated_data["request_id"]

        tenant = request.tenant

        if _is_client(request):
            client = _get_client_profile(request)
            if not client:
                return Response(
                    {"success": False, "message": "Client profile not found."},
                    status=404,
                )
            req = RequestRepository.get_by_id_for_client(
                request_id, tenant.id, client.id
            )
        else:
            req = RequestRepository.get_by_id(request_id, tenant.id)

        if not req:
            return Response(
                {"success": False, "message": "Request not found."}, status=404
            )

        try:
            result = FileService.generate_presigned_upload_url(
                tenant_id=str(tenant.id),
                request_id=str(request_id),
                file_name=serializer.validated_data["file_name"],
                file_type=serializer.validated_data["file_type"],
                uploaded_by_id=str(request.user.id),
            )
        except S3PresignError as e:
            return Response({"success": False, "message": str(e)}, status=500)

        return Response({"success": True, "data": result})


class ConfirmUploadView(APIView):
    """
    Step 2 of file upload.
    After the frontend successfully uploads to S3, call this to register the File record.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not (_is_provider(request) or _is_client(request)):
            return Response({"success": False, "message": "Forbidden."}, status=403)

        serializer = ConfirmUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        request_id = serializer.validated_data["request_id"]

        tenant = request.tenant

        if _is_client(request):
            client = _get_client_profile(request)
            if not client:
                return Response(
                    {"success": False, "message": "Client profile not found."},
                    status=404,
                )

            req = RequestRepository.get_by_id_for_client(
                request_id, tenant.id, client.id
            )
        else:
            req = RequestRepository.get_by_id(request_id, tenant.id)

        if not req:
            return Response(
                {"success": False, "message": "Request not found."}, status=404
            )

        try:
            file_obj = FileService.confirm_upload(
                tenant=tenant,
                request_id=request_id,
                uploaded_by=request.user,
                file_name=serializer.validated_data["file_name"],
                s3_key=serializer.validated_data["s3_key"],
                file_size_bytes=serializer.validated_data["file_size_bytes"],
                file_type=serializer.validated_data["file_type"],
            )
        except RequestNotFound as e:
            return Response({"success": False, "message": str(e)}, status=404)

        return Response(
            {
                "success": True,
                "message": "File registered.",
                "data": FileSerializer(file_obj).data,
            },
            status=status.HTTP_201_CREATED,
        )


# Files List for a request
class RequestFilesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, request_id):
        tenant = request.tenant

        if _is_client(request):
            client = _get_client_profile(request)
            if not client:
                return Response(
                    {"success": False, "message": "Client profile not found."},
                    status=404,
                )

            req = RequestRepository.get_by_id_for_client(
                request_id, tenant.id, client.id
            )
        elif _is_provider(request):
            req = RequestRepository.get_by_id(request_id, tenant.id)

        else:
            return Response({"success": False, "message": "Forbidden."}, status=403)

        if not req:
            return Response(
                {"success": False, "message": "Request not found."}, status=404
            )

        files = FileRepository.get_for_request(request_id, tenant.id)
        return Response(
            {"success": True, "data": FileSerializer(files, many=True).data}
        )


class DeliveryReviewView(APIView):
    """Client approves or requests rework on a delivered request."""

    permission_classes = [IsAuthenticated]

    def post(self, request, request_id, delivery_id):
        if not _is_client(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)

        client = _get_client_profile(request)
        if not client:
            return Response(
                {"success": False, "message": "Client profile not found."}, status=404
            )

        if client.is_deactivated:
            return Response(
                {"success": False, "message": "Your access has been deactivated."},
                status=403,
            )

        serializer = DeliveryReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            req = RequestService.review_delivery(
                request_id=request_id,
                delivery_id=delivery_id,
                tenant=request.tenant,
                client=client,
                action=serializer.validated_data["action"],
                message=serializer.validated_data.get("message"),
            )
        except RequestNotFound as e:
            return Response({"success": False, "message": str(e)}, status=404)
        except DeliveryNotFound as e:
            return Response({"success": False, "message": str(e)}, status=404)
        except ForbiddenStatusTransition as e:
            return Response({"success": False, "message": str(e)}, status=409)

        return Response(
            {
                "success": True,
                "message": (
                    "Delivery approved."
                    if serializer.validated_data["action"] == "approve"
                    else "Rework requested."
                ),
                "data": RequestDetailSerializer(req).data,
            }
        )


class SuggestRepliesView(APIView):

    def post(self, request, request_id):
        if not _is_provider(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)

        if not request.tenant.is_pro:
            return Response(
                {
                    "success": False,
                    "error_type": "pro_feature_required",
                    "message": "Reply suggestions are a Pro feature. Upgrade to unlock AI-powered replies.",
                },
                status=403,
            )

        request_obj = RequestRepository.get_by_id(request_id, request.tenant.id)
        if not request_obj:
            return Response(
                {"success": False, "message": "Request not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        last_messages = request_obj.messages.order_by("-created_at")[:5]
        thread = "\n".join(
            f"{m.sender.display_name}: {m.content}" for m in reversed(last_messages)
        )

        try:
            raw = AIService.complete(
                system=(
                    "Suggest 3 short, distinct reply options the provider could send next in this "
                    "client chat thread. Return as a numbered list, 1-2 sentences each, no preamble."
                ),
                user=thread
                or f"Request: {request_obj.title}\n{request_obj.description}",
                max_tokens=600,
            )
        except AIRateLimitError:
            return Response(
                {"success": False, "message": "AI is busy, try again shortly."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        except AIServiceError:
            return Response(
                {"success": False, "message": "AI suggestions unavailable right now."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        suggestions = [
            line.split(".", 1)[-1].strip() for line in raw.splitlines() if line.strip()
        ][:3]
        return Response({"success": True, "data": {"suggestions": suggestions}})


class SuggestDeliveryMessageView(APIView):
    def post(self, request, request_id):
        if not _is_provider(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)

        if not request.tenant.is_pro:
            return Response(
                {
                    "success": False,
                    "error_type": "pro_feature_required",
                    "message": "AI delivery messages are a Pro feature. Upgrade to unlock this.",
                },
                status=403,
            )

        request_obj = RequestRepository.get_by_id(request_id, request.tenant.id)
        if not request_obj:
            return Response(
                {"success": False, "message": "Request not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            message = AIService.complete(
                system="Write a short, friendly delivery message to the client for this completed request. 2-3 sentences.",
                user=f"Title: {request_obj.title}\nDescription: {request_obj.description}",
                max_tokens=500,
            )
        except AIRateLimitError:
            return Response(
                {"success": False, "message": "AI is busy, try again shortly."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        except AIServiceError:
            return Response(
                {"success": False, "message": "AI suggestion unavailable right now."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({"success": True, "data": {"message": message}})


class RegenerateSummaryView(APIView):
    def post(self, request, request_id):
        if not _is_provider(request):
            return Response({"success": False, "message": "Forbidden."}, status=403)

        if not request.tenant.is_pro:
            return Response(
                {
                    "success": False,
                    "error_type": "pro_feature_required",
                    "message": "AI summaries are a Pro feature. Upgrade to unlock this.",
                },
                status=403,
            )

        request_obj = RequestRepository.get_by_id(request_id, request.tenant.id)
        if not request_obj:
            return Response(
                {"detail": "Request not found."}, status=status.HTTP_404_NOT_FOUND
            )

        Request.objects.filter(id=request_id).update(ai_summary=None)
        generate_request_summary.delay(str(request_id))
        return Response(
            {"detail": "Regenerating summary."}, status=status.HTTP_202_ACCEPTED
        )
