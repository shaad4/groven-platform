"""Read-only inventory of old, unreferenced confirmed upload copies.

This intentionally never deletes: an inventory snapshot alone cannot coordinate
with an in-flight confirmation or prove that production references are complete.
"""
import json
import re
from datetime import timedelta
from uuid import UUID

import boto3
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.request_management.models import File


class Command(BaseCommand):
    help = "Report old unreferenced upload copies for one tenant; never delete objects."

    def add_arguments(self, parser):
        parser.add_argument('--tenant-id', required=True, type=UUID)
        parser.add_argument('--min-age-hours', type=int, default=24)
        parser.add_argument('--page-size', type=int, default=500)
        parser.add_argument('--continuation-token')

    def handle(self, *args, **options):
        if options['min_age_hours'] < 24:
            raise CommandError('The minimum audit age is 24 hours.')
        if not 1 <= options['page_size'] <= 1000:
            raise CommandError('Page size must be between 1 and 1000.')
        tenant_id = str(options['tenant_id'])
        prefix = f'tenants/{tenant_id}/requests/'
        pattern = re.compile(re.escape(prefix) + r'[0-9a-f-]{36}/confirmed/[0-9a-f-]{36}/[0-9a-f]{32}$')
        client = boto3.client('s3', region_name=settings.AWS_S3_REGION_NAME,
                              aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                              aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY)
        params = dict(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Prefix=prefix, MaxKeys=options['page_size'])
        if options['continuation_token']:
            params['ContinuationToken'] = options['continuation_token']
        page = client.list_objects_v2(**params)
        cutoff = timezone.now() - timedelta(hours=options['min_age_hours'])
        objects = [obj for obj in page.get('Contents', [])
                   if pattern.fullmatch(obj['Key']) and obj.get('LastModified')
                   and obj['LastModified'] < cutoff]
        # Preserve every database reference, including soft-deleted files and
        # references associated with another tenant due to legacy inconsistencies.
        referenced = set(File.objects.filter(s3_key__in=[obj['Key'] for obj in objects])
                         .values_list('s3_key', flat=True))
        candidates = [{"key": obj['Key'], "size_bytes": obj.get('Size'),
                       "last_modified": obj['LastModified'].isoformat()}
                      for obj in objects if obj['Key'] not in referenced]
        self.stdout.write(json.dumps({
            "read_only": True, "bucket": settings.AWS_STORAGE_BUCKET_NAME,
            "tenant_id": tenant_id, "candidates": candidates,
            "referenced_preserved": len(referenced),
            "next_continuation_token": page.get('NextContinuationToken'),
            "warning": "Candidates are not deletion approvals; revalidate references and quiesce upload writers before any cleanup.",
        }, indent=2))
