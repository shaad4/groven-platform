from unittest.mock import patch

import pytest
from rest_framework.exceptions import ValidationError
from apps.request_management.models import Request
from apps.request_management.services import FileService


@pytest.mark.django_db
@pytest.mark.parametrize("tamper", [None, "key", "user", "name", "type", "size", "expired", "missing"])
def test_upload_confirmation_binds_object(tenant, client_profile, provider_user, client_user, tamper):
    req = Request.objects.create(tenant=tenant, client=client_profile,
                                 provider=provider_user, title="Files")
    with patch("apps.request_management.services.boto3.client") as factory:
        s3 = factory.return_value
        s3.generate_presigned_post.return_value = {"url": "https://example.com", "fields": {}}
        s3.head_object.return_value = {"ContentLength": 10, "ContentType": "text/plain"}
        upload = FileService.generate_presigned_upload_url(
            tenant.id, req.id, "hello.txt", "text/plain", provider_user.id)
        args = dict(tenant=tenant, request_id=req.id, uploaded_by=provider_user,
                    file_name="hello.txt", s3_key=upload["s3_key"],
                    file_size_bytes=10, file_type="text/plain")
        if tamper == "key":
            args["s3_key"] = f"tenants/{tenant.id}/requests/{req.id}/arbitrary.txt"
        elif tamper == "user":
            args["uploaded_by"] = client_user
        elif tamper == "name":
            args["file_name"] = "other.txt"
        elif tamper == "type":
            args["file_type"] = "text/html"
        elif tamper == "size":
            args["file_size_bytes"] = 11
        elif tamper == "expired":
            from django.core import signing
            with patch("django.core.signing.time.time", return_value=0):
                payload = signing.dumps({}, salt="file-upload")
            args["s3_key"] = f"tenants/{tenant.id}/requests/{req.id}/{payload}"
        elif tamper == "missing":
            from botocore.exceptions import ClientError
            s3.head_object.side_effect = ClientError({"Error": {"Code": "404"}}, "HeadObject")
        if tamper:
            with pytest.raises(ValidationError):
                FileService.confirm_upload(**args)
            assert not req.files.exists()
        else:
            result = FileService.confirm_upload(**args)
            assert result.s3_key == upload["s3_key"]
            assert FileService.confirm_upload(**args).id == result.id
            assert req.files.count() == 1
