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
        s3.head_object.return_value = {"ContentLength": 10, "ContentType": "text/plain", "ETag": '"verified-etag"'}
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
            assert result.s3_key != upload["s3_key"]
            assert "/confirmed/" in result.s3_key
            s3.copy_object.assert_called_once()
            assert FileService.confirm_upload(**args).id == result.id
            assert req.files.count() == 1

@pytest.mark.django_db(transaction=True)
def test_concurrent_confirmations_create_one_file_and_activity(tenant, client_profile, provider_user):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from django.db import close_old_connections, connection
    from apps.request_management.models import File, RequestActivity
    if connection.vendor != "postgresql":
        pytest.skip("Row-lock concurrency must be verified on PostgreSQL")
    req = Request.objects.create(tenant=tenant, client=client_profile, provider=provider_user, title="Concurrent upload")
    barrier = Barrier(4, timeout=10)
    with patch("apps.request_management.services.boto3.client") as factory:
        s3 = factory.return_value
        s3.generate_presigned_post.return_value = {"url": "https://example.com", "fields": {}}
        upload = FileService.generate_presigned_upload_url(tenant.id, req.id, "one.txt", "text/plain", provider_user.id)

        def head(**kwargs):
            barrier.wait()  # all four requests reach verification before any confirms
            return {"ContentLength": 10, "ContentType": "text/plain", "ETag": '"verified-etag"'}
        s3.head_object.side_effect = head

        def confirm(_):
            close_old_connections()
            try:
                result = FileService.confirm_upload(tenant, req.id, provider_user,
                    "one.txt", upload["s3_key"], 10, "text/plain")
                return result.id
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=4) as pool:
            ids = list(pool.map(confirm, range(4)))
    assert len(set(ids)) == 1
    assert File.objects.filter(request=req).count() == 1
    assert File.objects.get(pk=ids[0]).upload_id is not None
    assert RequestActivity.objects.filter(request=req, event_type=RequestActivity.EventType.FILE_UPLOADED).count() == 1


@pytest.mark.django_db
def test_upload_identity_has_database_uniqueness(tenant, client_profile, provider_user):
    import uuid
    from django.db import IntegrityError, transaction
    from apps.request_management.models import File
    req = Request.objects.create(tenant=tenant, client=client_profile, provider=provider_user, title="Unique upload")
    fields = dict(tenant=tenant, request=req, uploaded_by=provider_user,
                  file_name="one.txt", file_size_bytes=10, upload_id=uuid.uuid4())
    File.objects.create(**fields)
    with pytest.raises(IntegrityError), transaction.atomic():
        File.objects.create(**fields)


@pytest.mark.django_db
def test_deleted_upload_cannot_be_reconfirmed(tenant, client_profile, provider_user):
    req = Request.objects.create(tenant=tenant, client=client_profile, provider=provider_user, title="Deleted upload")
    with patch("apps.request_management.services.boto3.client") as factory:
        s3 = factory.return_value
        s3.generate_presigned_post.return_value = {"url": "https://example.com", "fields": {}}
        s3.head_object.return_value = {"ContentLength": 10, "ContentType": "text/plain", "ETag": '"verified-etag"'}
        upload = FileService.generate_presigned_upload_url(tenant.id, req.id, "one.txt", "text/plain", provider_user.id)
        args = (tenant, req.id, provider_user, "one.txt", upload["s3_key"], 10, "text/plain")
        file = FileService.confirm_upload(*args)
        file.is_deleted = True
        file.save()
        with pytest.raises(ValidationError, match="deleted"):
            FileService.confirm_upload(*args)
        assert req.files.count() == 1

@pytest.mark.django_db
def test_file_registration_rolls_back_if_activity_write_fails(tenant, client_profile, provider_user):
    req = Request.objects.create(tenant=tenant, client=client_profile, provider=provider_user, title="Atomic upload")
    with patch("apps.request_management.services.boto3.client") as factory:
        s3 = factory.return_value
        s3.generate_presigned_post.return_value = {"url": "https://example.com", "fields": {}}
        s3.head_object.return_value = {"ContentLength": 10, "ContentType": "text/plain", "ETag": '"verified-etag"'}
        upload = FileService.generate_presigned_upload_url(tenant.id, req.id, "one.txt", "text/plain", provider_user.id)
        with patch("apps.request_management.repositories.RequestActivity.objects.create", side_effect=RuntimeError("write failed")), patch("apps.request_management.repositories.push_activity") as publish:
            with pytest.raises(RuntimeError, match="write failed"):
                FileService.confirm_upload(tenant, req.id, provider_user, "one.txt", upload["s3_key"], 10, "text/plain")
            publish.assert_not_called()
        assert not req.files.exists()


@pytest.mark.django_db(transaction=True)
def test_upload_identity_migration_preserves_legacy_duplicate_keys(tenant, client_profile, provider_user):
    from django.db import connection
    from django.db.migrations.executor import MigrationExecutor
    if connection.vendor != "postgresql":
        pytest.skip("Migration regression uses the PostgreSQL integration suite")
    previous = [("request_management", "0006_request_overdue_notified_at")]
    current = [("request_management", "0007_file_upload_id")]
    req = Request.objects.create(tenant=tenant, client=client_profile, provider=provider_user, title="Legacy uploads")
    try:
        executor = MigrationExecutor(connection)
        executor.migrate(previous)
        historical = executor.loader.project_state(previous).apps.get_model("request_management", "File")
        for _ in range(2):
            historical.objects.create(tenant_id=tenant.pk, request_id=req.pk,
                uploaded_by_id=provider_user.pk, file_name="legacy.txt",
                file_size_bytes=10, s3_key="same-legacy-key")
    finally:
        MigrationExecutor(connection).migrate(current)
    assert req.files.count() == 2
    assert all(file.upload_id is None for file in req.files.all())

@pytest.mark.django_db
def test_finalization_fails_if_staging_object_changes(tenant, client_profile, provider_user):
    from botocore.exceptions import ClientError
    req = Request.objects.create(tenant=tenant, client=client_profile, provider=provider_user, title="Changed upload")
    with patch("apps.request_management.services.boto3.client") as factory:
        s3 = factory.return_value
        s3.generate_presigned_post.return_value = {"url": "https://example.com", "fields": {}}
        s3.head_object.return_value = {"ContentLength": 10, "ContentType": "text/plain", "ETag": '"old"'}
        s3.copy_object.side_effect = ClientError({"Error": {"Code": "PreconditionFailed"}}, "CopyObject")
        upload = FileService.generate_presigned_upload_url(tenant.id, req.id, "one.txt", "text/plain", provider_user.id)
        with pytest.raises(ValidationError, match="changed"):
            FileService.confirm_upload(tenant, req.id, provider_user, "one.txt", upload["s3_key"], 10, "text/plain")
        assert s3.copy_object.call_args.kwargs["CopySourceIfMatch"] == '"old"'
        assert not req.files.exists()

@pytest.mark.django_db
def test_replaying_staging_upload_cannot_change_registered_download(tenant, client_profile, provider_user):
    req = Request.objects.create(tenant=tenant, client=client_profile, provider=provider_user, title="Immutable download")
    objects = {}
    with patch("apps.request_management.services.boto3.client") as factory:
        s3 = factory.return_value
        s3.generate_presigned_post.return_value = {"url": "https://example.com", "fields": {}}
        upload = FileService.generate_presigned_upload_url(tenant.id, req.id, "one.txt", "text/plain", provider_user.id)
        assert upload["s3_key"].startswith("staging/")
        objects[upload["s3_key"]] = b"original!!"
        s3.head_object.return_value = {"ContentLength": 10, "ContentType": "text/plain", "ETag": '"original"'}
        def copy(**kwargs):
            objects[kwargs["Key"]] = objects[kwargs["CopySource"]["Key"]]
            return {"CopyObjectResult": {"ETag": '"original"'}}
        s3.copy_object.side_effect = copy
        args = (tenant, req.id, provider_user, "one.txt", upload["s3_key"], 10, "text/plain")
        file = FileService.confirm_upload(*args)
        objects[upload["s3_key"]] = b"replaced!!"  # reuse still-valid client POST
        assert objects[file.s3_key] == b"original!!"
        assert FileService.confirm_upload(*args).id == file.id
        s3.copy_object.assert_called_once()

@pytest.mark.django_db(transaction=True)
def test_failed_upload_migration_rolls_back_then_recovers(tenant, client_profile, provider_user):
    from django.db import connection, migrations
    from django.db.migrations.executor import MigrationExecutor
    from django.db.migrations.recorder import MigrationRecorder
    if connection.vendor != 'postgresql':
        pytest.skip('Transactional DDL recovery is checked on PostgreSQL')
    previous = [('request_management', '0006_request_overdue_notified_at')]
    current = [('request_management', '0007_file_upload_id')]
    req = Request.objects.create(tenant=tenant, client=client_profile, provider=provider_user, title='Recovery')
    try:
        executor = MigrationExecutor(connection)
        executor.migrate(previous)
        historical = executor.loader.project_state(previous).apps.get_model('request_management', 'File')
        legacy = historical.objects.create(tenant_id=tenant.pk, request_id=req.pk,
            uploaded_by_id=provider_user.pk, file_name='preserved.txt', file_size_bytes=10, s3_key='legacy-recovery-key')
        original = migrations.AddField.database_forwards
        def fail_after_ddl(operation, *args, **kwargs):
            original(operation, *args, **kwargs)
            if operation.name == 'upload_id':
                raise RuntimeError('simulated failure after column creation')
        with patch.object(migrations.AddField, 'database_forwards', fail_after_ddl):
            with pytest.raises(RuntimeError, match='simulated failure'):
                MigrationExecutor(connection).migrate(current)
        with connection.cursor() as cursor:
            columns = {column.name for column in connection.introspection.get_table_description(cursor, 'files')}
        assert 'upload_id' not in columns
        assert not MigrationRecorder.Migration.objects.filter(app='request_management', name='0007_file_upload_id').exists()
        assert historical.objects.get(pk=legacy.pk).s3_key == 'legacy-recovery-key'
    finally:
        MigrationExecutor(connection).migrate(current)
    restored = req.files.get(pk=legacy.pk)
    assert restored.file_name == 'preserved.txt'
    assert restored.upload_id is None
