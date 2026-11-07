"""Probe only the local TLS fixture and scan logs without printing credentials.

Run once while Daphne is available, then with --upstream-down after stopping the
local test Daphne. Never point this script at a deployed environment.
"""
import argparse
import base64
from http.client import HTTPResponse
import json
import os
from pathlib import Path
import re
import socket
import ssl
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--upstream-down', action='store_true')
args = parser.parse_args()
marker = 'GROVEN_LOG_SAFETY_SENTINEL'


def probe(path, protocols):
    context = ssl.create_default_context(cafile='/tmp/groven-browser-nginx/cert.pem')
    with socket.create_connection(('127.0.0.1', 59443), timeout=5) as raw:
        with context.wrap_socket(raw, server_hostname='api.groven.localhost') as stream:
            key = base64.b64encode(os.urandom(16)).decode()
            request = (f'GET {path} HTTP/1.1\r\nHost: api.groven.localhost\r\n'
                       'Connection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Version: 13\r\n'
                       f'Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Protocol: {protocols}\r\n\r\n')
            stream.sendall(request.encode())
            response = HTTPResponse(stream)
            response.begin()
            response.read()
            return response.status


legacy_status = probe(f'/ws/feed/?tenant=check&token={marker}', 'groven.v1')
header_status = probe('/ws/feed/?tenant=check', f'groven.v1, groven.auth.{marker}')
if legacy_status != 400 or header_status != (502 if args.upstream_down else 403):
    raise SystemExit('Unexpected local probe status; no log contents printed.')
logs = subprocess.run(['docker', '--host=unix:///var/run/docker.sock', 'logs',
                       'groven-browser-nginx'], capture_output=True, text=True, check=True)
nginx = logs.stdout + logs.stderr
sources = {'nginx_access_and_errors': nginx}
for label, path in [('application_events', '/tmp/groven-ws-app-events.log'),
                    ('daphne_access', '/tmp/groven-ws-app-access.log'),
                    ('daphne_errors', '/tmp/groven-ws-app-errors.log')]:
    sources[label] = Path(path).read_text()
pattern = re.compile(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+')
if any(marker in content or pattern.search(content) for content in sources.values()):
    raise SystemExit('Credential-like material found in logs; values withheld.')
if args.upstream_down and 'connect() failed' not in nginx:
    raise SystemExit('Expected upstream failure was not exercised.')
print(json.dumps({'legacy_query_status': legacy_status, 'header_probe_status': header_status,
                  'upstream_down': args.upstream_down, 'credential_matches': 0,
                  'log_bytes_checked': {name: len(content.encode()) for name, content in sources.items()}}, indent=2))
