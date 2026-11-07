# WebSocket credential transport and log safety

The fix and saved validation survived the execution environment interruption.
No production access, merge, deployment or denied Actions API retry was performed.

## Authentication contract

Browser clients now offer `groven.v1` and `groven.auth.<JWT>` through the standard
WebSocket constructor's protocol list. URLs contain only the workspace selector.
The server requires exactly one credential, validates JWT and membership, and
negotiates only `groven.v1`; it never echoes the credential protocol. It removes
the credential subprotocol/header from the downstream application's scope.
Existing ownership, revocation, expiry and refresh protections remain intact.

URL-token authentication is rejected, including requests containing both header
and query credentials. There is deliberately no insecure legacy fallback.

The protocol header remains a **bearer credential**. Use WSS. Gateways, WAFs,
tracing/APM and custom logging must redact `Sec-WebSocket-Protocol` alongside
Authorization and Cookie. This change cannot protect against arbitrary header
logging, debug packet captures, privileged interception or XSS.

## nginx behavior

Each server explicitly selects `groven_safe`, logging method/path/status/size/time
without query strings, referrers or headers. Per-server placement matters: the
first local probe detected an inherited default log still writing full URLs when
the safe format was configured only at HTTP scope. That was fixed and tested again
with a fresh nginx container.

The WebSocket location accepts only `tenant=<ASCII slug>` as its query. Legacy
token URLs return 400 before proxying, including when Daphne is unavailable.
Normal error logging remains enabled; production error logs are not suppressed.
Tests cover normal traffic, rejected authentication and upstream connection failure,
not every malformed HTTP/parser error or custom debug configuration.

## Saved validation

- PostgreSQL 16 / Redis 7, real migrations: **95 backend tests passed**, one opt-in
  benchmark skipped. Transport cases cover valid, invalid, missing, duplicate,
  legacy query-only and conflicting query/header credentials.
- **33 frontend tests passed**; build passed; lint **0 errors / 141 warnings**.
- Real local HTTPS browser login, cookie-based refresh, token renewal, WebSocket
  reconnect and rejected-refresh logout passed. URLs contained no credentials,
  selected protocol was groven.v1 and no JavaScript exceptions occurred.
- Full production nginx configuration passed `nginx -t` with local TLS fixtures.
- Upstream available: legacy query -> 400, invalid header credential -> 403.
  Upstream stopped: legacy query -> 400, header probe -> 502, exercising real
  upstream-error logging.
- Application INFO records, Daphne access/stderr and nginx access/error output had
  **zero JWT-pattern or credential-sentinel matches** after the fix. The probe
  checks values in memory without printing them. Saved reports contain only
  statuses, byte counts and booleans.

Reports: [browser](benchmarks/websocket-protocol-browser.json),
[upstream available](benchmarks/websocket-logs-upstream-up.json),
[upstream unavailable](benchmarks/websocket-logs-upstream-down.json).

Use the local fixture setup in [the browser rehearsal guide](upload-audit-browser-and-recovery.md).
Run Daphne with `--access-log /tmp/groven-ws-app-access.log` and redirect stderr to
`/tmp/groven-ws-app-errors.log`; browser settings capture application INFO records
in `/tmp/groven-ws-app-events.log`. Run `scripts/check-browser-session.cjs`, then
`python scripts/check-websocket-log-safety.py`. Stop only the local Daphne process
and repeat the latter with `--upstream-down`. Use a fresh test nginx container so
old failed-probe logs do not contaminate the result.

## Rollout and remaining limitations

- Release frontend, backend and nginx together through the prepared coordinated
  workflow. **Cached legacy clients must reload**; native clients must update their
  handshake. Old token URLs fail closed. No new database migration is added here;
  the branch's prior migration 0007 is still required.
- Real ingress must preserve the offered/selected protocol headers. Verify actual
  header forwarding, APM redaction, debug logging policy and client refresh in staging.
- Historical logs may contain old credentials. Review their access/retention and
  session revocation requirements; no production logs were accessed or modified.
- S3 cleanup/storage permissions, production environment approvals, hosted CI,
  broader load testing and operational recovery remain as previously documented.

This is locally verified hardening, not certification of production readiness.
