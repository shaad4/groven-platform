# Groven production-readiness review

Branch: `optimize/production-readiness`. Base: current `origin/develop`,
`2d7b9b67cf5374108edab64ae544452a0dd06cea`. No merge or deployment performed.

## Changes

- Shared HTTP/WebSocket chat authorization requires active workspace membership;
  clients can only access their own non-deleted requests. Providers retain the
  existing workspace-wide inbox policy. Chat attachments must belong to the same
  request and must not be deleted.
- Upload keys carry signed, expiring metadata binding the uploader, tenant,
  request, filename and content type, plus a random nonce to avoid collisions.
  Confirmation verifies S3 object existence, size and content type. Sequential
  retries return the existing file. The API response/input shape is unchanged.
- Refresh-cookie authentication ignores stale access headers.
- Request lists aggregate active file counts in the list query.
- WebSocket effects own their timers and sockets, preventing old close events
  from reconnecting after navigation or React StrictMode cleanup.
- Frontend asset locations inherit gzip settings. Client walkthrough replay
  receives its missing close callback.
- Isolated test settings and CI checks cover backend tests, frontend lint,
  frontend tests and production builds without production credentials.

## Reproducible checks and measurements

```sh
python -m pip install -r backend/requirements-test.txt
cd backend
pytest --ds=config.test_settings --no-cov -q
# From frontend:
npm ci
npm run lint
npm test -- --runInBand
npm run build
```

Initial validation: 60 tests passed with SQLite. Follow-up validation: 63 tests
passed with real PostgreSQL 16 migrations and Redis 7, including HTTP-to-WebSocket
message delivery; one opt-in benchmark skipped. External AI, email and S3 remain
mocked. Frontend: 28 tests passed. Production Vite build succeeds. See
[integration and performance follow-up](integration-performance-results.md).

The list-query regression test compares the previous query shape to the new one:
1 request: 2 -> 1 SQL queries; 20 requests: 21 -> 1. Deleted files remain excluded.
These are measured serializer/query counts, not production response-time claims.

Local baseline Vite build: 1.42 seconds; after the socket changes: 1.41 seconds.
This difference is noise and is not evidence of faster startup. The baseline main
JS chunk was 420.95 kB, 138.77 kB gzip (~67% fewer transfer bytes when gzip is
negotiated). This is Vite's compression estimate; actual nginx response headers,
transfer size and browser startup timing still need staging verification.

## Remaining release checks and risks

- Local PostgreSQL migrations and Redis integration now pass. Real S3, staging
  sessions and production-like tenant distributions remain release checks.
- Full nginx configuration syntax and actual gzip responses now pass locally.
  Verify deployed certificates, API upstreams and cache/CDN behavior in staging.
- Confirm S3 identity permits HeadObject (s3:GetObject); confirmation now fails
  closed if verification is unavailable. Uploads begun before this change must
  obtain a new presigned URL. Existing registered downloads remain compatible.
- Concurrent confirmations now serialize with a request-row lock and a unique
  upload identity (migration 0007). Object scanning, quota enforcement and
  storage orphan cleanup still require staging work. New uploads now finalize
  into server-only keys to prevent overwrite through presigned staging URLs.
- Socket access is now rechecked before inbound/outbound events; idle revoked
  sockets close on their next event. Idle JWT expiry now has a timer and frontend
  session recovery; see the release/session follow-up.
- List and chat-history payload sizes, other serializers, synchronous AI paths,
  and browser rendering still need profiling under realistic load. Optional AI
  clients now initialize on demand; missing Groq credentials no longer break
  application loading.
- Lint warnings remain, including React dependency/rendering warnings. They need
  focused reviews; passing the test suite does not establish full feature coverage.
- Deployment now uses an explicit reviewed SHA, reusable checks, maintenance-mode
  migrations and coordinated restarts. Required environment reviewers, SSH host
  keys and staging validation still need operator configuration.

This is a tested hardening increment, not certification of production readiness.

Latest security verification: [socket and upload hardening](security-hardening-followup.md).

Latest release preparation: [workflow, storage and session expiry](release-workflow-and-session-hardening.md).

Later verification: [read-only upload audit, authenticated browser refresh and migration recovery](upload-audit-browser-and-recovery.md).
