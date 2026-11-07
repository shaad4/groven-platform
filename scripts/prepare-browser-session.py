"""Prepare fixtures only for config.browser_test_settings' disposable local DB.

Start the integration PostgreSQL/Redis containers first. This never targets the
production settings or changes any deployed environment.
"""
import os
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / 'backend'))
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.browser_test_settings'
import django  # noqa: E402
django.setup()
from django.core.management import call_command  # noqa: E402
from apps.users.models import User  # noqa: E402
from apps.tenants.models import Tenant, TenantMembership, TenantUsage, Plan  # noqa: E402

call_command('migrate', interactive=False, verbosity=0)
plan, _ = Plan.objects.get_or_create(name='free', defaults={
    'client_limit': 3, 'request_limit': 10, 'price_monthly': 0})
user, _ = User.objects.get_or_create(email='browser-check@example.test', defaults={
    'display_name': 'Browser Check', 'is_active': True, 'is_email_verified': True})
user.set_password('local-browser-check-only')
user.save()
tenant, _ = Tenant.objects.get_or_create(slug='check', defaults={
    'name': 'Local Browser Workspace', 'plan': plan})
TenantUsage.objects.get_or_create(tenant=tenant)
TenantMembership.objects.get_or_create(tenant=tenant, user=user, defaults={
    'role': 'provider', 'is_active': True})
fixtures = Path('/tmp/groven-browser-nginx')
fixtures.mkdir(exist_ok=True)
subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
                '-keyout', str(fixtures / 'key.pem'), '-out', str(fixtures / 'cert.pem'),
                '-days', '1', '-subj', '/CN=groven.localhost', '-addext',
                'subjectAltName=DNS:groven.localhost,DNS:*.groven.localhost'],
               check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
(fixtures / 'default.conf').write_text('''server {
 listen 443 ssl;
 server_name groven.localhost *.groven.localhost;
 ssl_certificate /fixtures/cert.pem;
 ssl_certificate_key /fixtures/key.pem;
 root /usr/share/nginx/html;
 location /api/ {
  proxy_pass http://groven-backend:59800;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto https;
 }
 location /ws/ {
  access_log off;
  error_log /dev/null;
  proxy_pass http://groven-backend:59800;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
 }
 location / { try_files $uri /index.html; }
}
''')
print('Disposable local DB and TLS fixtures prepared. No production settings used.')
