from django.db import DatabaseError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.logger import logger
from apps.request_management.models import Request

from .access import get_chat_request
from .repositories import MessageRepository
from .serializers import MessageSerializer
from .services import create_message, mark_messages_read

# Create your views here.


class MessageListCreateView(APIView):

    def get(self, request, request_id):
        try:
            req_obj = get_chat_request(request_id, request.tenant, request.user)
            if req_obj is None:
                return Response(
                    {"success": False, "message": "Request not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            messages = MessageRepository.get_for_request(request_id, request.tenant.id)
            serializer = MessageSerializer(messages, many=True)
            return Response({"success": True, "results": serializer.data})

        except Exception as e:
            logger.error(f"[MessageListCreateView.get] Unexpected error: {e}")
            return Response(
                {"success": False, "message": "Something went wrong."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def post(self, request, request_id):
        try:
            req_obj = get_chat_request(request_id, request.tenant, request.user)
            if req_obj is None:
                return Response(
                    {"success": False, "message": "Request not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if req_obj.status == Request.Status.CLOSED:
                return Response(
                    {
                        "success": False,
                        "message": "Cannot send messages on a closed request.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            content = request.data.get("content", "").strip()
            attachment_ids = request.data.get("attachment_ids", [])

            if not content and not attachment_ids:
                return Response(
                    {
                        "success": False,
                        "message": "Message content or an attachment is required.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            message = create_message(req_obj, request.user, content, attachment_ids)
            serializer = MessageSerializer(message)
            return Response(
                {"success": True, "message": serializer.data},
                status=status.HTTP_201_CREATED,
            )
        except DatabaseError as e:
            logger.error(f"[MessageListCreateView.post] DB error: {e}")
            return Response(
                {"success": False, "message": "Failed to send message."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as e:
            logger.error(f"[MessageListCreateView.post] Unexpected error: {e}")
            return Response(
                {"success": False, "message": "Something went wrong."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class MarkMessagesReadView(APIView):

    def post(self, request, request_id):
        try:
            req_obj = get_chat_request(request_id, request.tenant, request.user)
            if req_obj is None:
                return Response(
                    {"success": False, "message": "Request not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            updated = mark_messages_read(req_obj, request.user)
            return Response({"success": True, "marked_read": updated})

        except Exception as e:
            logger.error(f"[MarkMessagesReadView.post] Unexpected error: {e}")
            return Response(
                {"success": False, "message": "Something went wrong."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
