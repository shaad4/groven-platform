import json
import uuid
from datetime import timedelta
from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.utils import timezone
from apps.request_management.models import File, Request


@pytest.mark.django_db
def test_audit_preserves_references_and_never_deletes(tenant, client_profile, provider_user):
    req = Request.objects.create(tenant=tenant, client=client_profile, provider=provider_user, title="Audit")
    prefix = f"tenants/{tenant.id}/requests/{req.id}/confirmed/{uuid.uuid4()}/"
    keys = [prefix + f"{i:032x}" for i in range(4)]
    for key, deleted in zip(keys[:2], [False, True]):
        File.objects.create(tenant=tenant, request=req, uploaded_by=provider_user,
                            file_name="keep.txt", file_size_bytes=10, s3_key=key, is_deleted=deleted)
    old = timezone.now() - timedelta(days=2)
    objects = [{"Key": key, "LastModified": old, "Size": 10} for key in keys[:3]]
    objects += [{"Key": keys[3], "LastModified": timezone.now(), "Size": 10},
                {"Key": f"tenants/{tenant.id}/legacy-file", "LastModified": old, "Size": 10}]
    output = StringIO()
    with patch('apps.request_management.management.commands.audit_upload_copies.boto3.client') as factory:
        factory.return_value.list_objects_v2.return_value = {
            "Contents": objects, "NextContinuationToken": "next-page"}
        call_command('audit_upload_copies', tenant_id=tenant.id, stdout=output)
        report = json.loads(output.getvalue())
        assert [obj['key'] for obj in report['candidates']] == [keys[2]]
        assert report['referenced_preserved'] == 2
        assert report['next_continuation_token'] == 'next-page'
        factory.return_value.delete_object.assert_not_called()
        factory.return_value.delete_objects.assert_not_called()


def test_audit_rejects_unsafe_age():
    with pytest.raises(CommandError, match='24 hours'):
        call_command('audit_upload_copies', tenant_id=uuid.uuid4(), min_age_hours=1)
