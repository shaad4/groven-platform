import uuid
import pytest
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import status
from unittest.mock import patch

from apps.users.models import EmailVerificationToken
from apps.users.services import ProviderSignupService, InvalidOrExpiredToken
from apps.users.repositories import EmailVerificationTokenRepository

User = get_user_model()

@pytest.mark.django_db
class TestUserModel:
    def test_create_user(self):
        user = User.objects.create_user(
            email="testuser@example.com",
            password="securepassword",
            display_name="Test User"
        )
        assert user.email == "testuser@example.com"
        assert user.check_password("securepassword") is True
        assert user.is_active is False  # Defaults to False for self registration
        assert user.is_staff is False
        assert user.is_superuser is False

    def test_create_superuser(self):
        superuser = User.objects.create_superuser(
            email="superuser@example.com",
            password="securepassword",
            display_name="Super User"
        )
        assert superuser.email == "superuser@example.com"
        assert superuser.is_active is True
        assert superuser.is_staff is True
        assert superuser.is_superuser is True

    def test_create_user_no_email_raises_value_error(self):
        with pytest.raises(ValueError, match="Email is required."):
            User.objects.create_user(
                email="",
                password="securepassword",
                display_name="Test User"
            )


@pytest.mark.django_db
class TestProviderSignupService:
    def test_register_creates_unverified_user_and_token(self):
        result = ProviderSignupService.register(
            email="newprovider@example.com",
            password="securepassword",
            display_name="New Provider"
        )
        user = result["user"]
        token = result["verification_token"]

        assert user.email == "newprovider@example.com"
        assert user.is_active is False
        assert token.user == user
        assert token.status == EmailVerificationToken.Status.PENDING
        assert token.expires_at > timezone.now()

    def test_verify_email_success(self):
        reg_result = ProviderSignupService.register(
            email="verify@example.com",
            password="securepassword",
            display_name="Verify Me"
        )
        token = reg_result["verification_token"]

        verify_result = ProviderSignupService.verify_email(token.token)
        user = verify_result["user"]

        assert user.is_active is True
        token.refresh_from_db()
        assert token.status == EmailVerificationToken.Status.USED

    def test_verify_email_invalid_token_raises_exception(self):
        random_token = uuid.uuid4()
        with pytest.raises(InvalidOrExpiredToken, match="Invalid or already-used verification token."):
            ProviderSignupService.verify_email(random_token)

    def test_verify_email_expired_token_raises_exception(self):
        reg_result = ProviderSignupService.register(
            email="expired@example.com",
            password="securepassword",
            display_name="Expired User"
        )
        token = reg_result["verification_token"]
        # Manually expire the token
        token.expires_at = timezone.now() - timezone.timedelta(minutes=1)
        token.save()

        with pytest.raises(InvalidOrExpiredToken, match="This verification link has expired."):
            ProviderSignupService.verify_email(token.token)


@pytest.mark.django_db
class TestUserViews:
    @patch("apps.users.views.send_verification_email.delay")
    def test_provider_signup_view_success(self, mock_send_email, api_client):
        url = "/api/auth/register/"
        data = {
            "email": "signupview@example.com",
            "password": "strongpassword123",
            "display_name": "Signup View Test"
        }
        response = api_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["success"] is True
        assert response.data["data"]["email"] == "signupview@example.com"
        assert response.data["data"]["requires_verification"] is True
        mock_send_email.assert_called_once()

    def test_verify_email_api_view_success(self, api_client):
        reg_result = ProviderSignupService.register(
            email="apiverify@example.com",
            password="securepassword",
            display_name="API Verify"
        )
        token = reg_result["verification_token"]

        url = "/api/auth/verify-email/"
        response = api_client.post(url, {"token": str(token.token)}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert response.data["data"]["needs_workspace"] is True
        assert "access" in response.data["data"]

@pytest.mark.django_db
def test_refresh_accepts_expired_access_header(api_client, provider_user):
    from datetime import timedelta
    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(provider_user)
    access = refresh.access_token
    access.set_exp(lifetime=timedelta(seconds=-1))
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    api_client.cookies["refresh_token"] = str(refresh)
    response = api_client.post("/api/auth/token/refresh/", {}, format="json")
    assert response.status_code == 200
    assert response.data["access"]
