from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.tenants.models import TenantMembership

from .serializers import (ClientNotificationSerializer, DisplayNameSerializer,
                          PasswordChangeSerializer,
                          ProviderNotificationSerializer,
                          WorkspaceUpdateSerializer)
from .services import (DeleteAccountService, FileTooLarge, InvalidFileType,
                       NotificationService, ProfileService, S3UploadError,
                       SlugAlreadyTaken, WorkspaceService,
                       WrongCurrentPassword)

# Create your views here.


# Helpers
def _get_role(request):
    membership = getattr(request, "tenant_membership", None)
    return membership.role if membership else None


def _require_provider(request):
    """Returns None if OK, or a 403 Response if not a provider."""

    role = _get_role(request)
    if role != TenantMembership.Role.PROVIDER:
        return Response(
            {"success": False, "message": "Provider access only."},
            status=403,
        )
    return None


def _require_tenant(request):
    """Returns tenant or a 400 Response"""
    tenant = getattr(request, "tenant", None)
    if tenant is None:
        return None, Response(
            {"success": False, "message": "Workspace not found."},
            status=400,
        )
    return tenant, None


# Profile Settings View
class ProfileSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = ProfileService.get_profile(request.user)
        return Response({"success": True, "data": data})

    def patch(self, request):
        user = request.user
        errors = {}
        updated = {}

        if "display_name" in request.data:
            s = DisplayNameSerializer(data=request.data)
            if s.is_valid():
                ProfileService.update_display_name(
                    user, s.validated_data["display_name"]
                )
                updated["display_name"] = user.display_name

            else:
                errors.update(s.errors)

        if "current_password" in request.data:
            s = PasswordChangeSerializer(data=request.data)

            if s.is_valid():
                try:
                    ProfileService.change_password(
                        user,
                        s.validated_data["current_password"],
                        s.validated_data["new_password"],
                    )
                    updated["password_changed"] = True
                except WrongCurrentPassword as e:
                    errors["current_password"] = [str(e)]

            else:
                errors.update(s.errors)

        if errors:
            return Response({"success": False, "errors": errors}, status=400)

        return Response(
            {
                "success": True,
                "message": "Profile updated.",
                "data": updated,
            }
        )


# Avatar Upload View


class AvatarUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get("avatar")
        if not file:
            return Response(
                {"success": False, "message": "No file provided."},
                status=400,
            )
        try:
            url = ProfileService.upload_avatar(request.user, file)
        except InvalidFileType as e:
            return Response({"success": False, "message": str(e)}, status=400)
        except FileTooLarge as e:
            return Response({"success": False, "message": str(e)}, status=400)
        except S3UploadError as e:
            return Response({"success": False, "message": str(e)}, status=500)

        return Response(
            {
                "success": True,
                "message": "Avatar updated.",
                "data": {"avatar_url": url},
            }
        )


# Workspace Settings


class WorkspaceSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        denied = _require_provider(request)
        if denied:
            return denied

        tenant, err = _require_tenant(request)
        if err:
            return err

        data = WorkspaceService.get_workspace(tenant)
        return Response({"success": True, "data": data})

    def patch(self, request):
        denied = _require_provider(request)
        if denied:
            return denied

        tenant, err = _require_tenant(request)
        if err:
            return err

        serializer = WorkspaceUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=400)

        try:
            tenant, slug_changed = WorkspaceService.update_workspace(
                tenant, serializer.validated_data
            )
        except SlugAlreadyTaken as e:
            return Response({"success": False, "message": str(e)}, status=409)

        return Response(
            {
                "success": True,
                "message": "Workspace updated.",
                "data": {
                    **WorkspaceService.get_workspace(tenant),
                    "slug_changed": slug_changed,
                },
            }
        )


# Logo Upload
class LogoUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        denied = _require_provider(request)
        if denied:
            return denied

        tenant, err = _require_tenant(request)
        if err:
            return err

        file = request.FILES.get("logo")
        if not file:
            return Response(
                {"success": False, "message": "No file provided."},
                status=400,
            )

        try:
            url = WorkspaceService.upload_logo(tenant, file)
        except InvalidFileType as e:
            return Response({"success": False, "message": str(e)}, status=400)
        except FileTooLarge as e:
            return Response({"success": False, "message": str(e)}, status=400)
        except S3UploadError as e:
            return Response({"success": False, "message": str(e)}, status=500)

        return Response(
            {
                "success": True,
                "message": "Logo updated.",
                "data": {"logo_url": url},
            }
        )


# Notification Settings
class NotificationSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_role(self, request):
        membership = getattr(request, "tenant_membership", None)
        return membership.role if membership else "client"

    def get(self, request):
        role = self._get_role(request)
        data = NotificationService.get_preferences(request.user, role)
        return Response({"success": True, "data": data})

    def patch(self, request):
        role = self._get_role(request)

        if role == TenantMembership.Role.PROVIDER:
            serializer = ProviderNotificationSerializer(data=request.data)
        else:
            serializer = ClientNotificationSerializer(data=request.data)

        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=400)

        data = NotificationService.update_preferences(
            request.user, role, serializer.validated_data
        )

        return Response(
            {
                "success": True,
                "message": "Notification preferences saved.",
                "data": data,
            }
        )


# Delete Account (Leave Membership)


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        tenant, err = _require_tenant(request)
        if err:
            return err

        confirm = request.data.get("confirm", False)
        if not confirm:
            return Response(
                {
                    "success": False,
                    "message": "Please confirm by sending confirm: true.",
                },
                status=400,
            )

        role = _get_role(request)
        if role is None:
            return Response(
                {"success": False, "message": "No active membership found."},
                status=404,
            )

        success = DeleteAccountService.leave_workspace(request.user, tenant, role)

        if not success:
            return Response(
                {"success": False, "message": "No active membership found."},
                status=404,
            )

        message = (
            "Your workspace and all associated client data have been deleted. "
            "Your account remains active."
            if role == TenantMembership.Role.PROVIDER
            else "You have left this workspace. Your account remains active."
        )
        return Response({"success": True, "message": message})
