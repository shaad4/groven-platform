# Upload audit, authenticated browser renewal and migration recovery

All work used disposable local services. No production credentials, live storage,
remote deployment, merge or previously denied Actions API operation was used.

## Read-only reference-aware upload audit

`audit_upload_copies` lists at most one bounded S3 inventory page for one tenant.
It considers only the generated confirmed-object key shape and objects at least
24 hours old. It checks all File references, including soft-deleted files and
cross-tenant legacy inconsistencies, before reporting candidates. Recent objects,
legacy key formats and referenced copies are preserved. Pagination is explicit.

```sh
# Read-only; requires authorized staging/storage credentials to use on a real bucket:
python manage.py audit_upload_copies --tenant-id <tenant-uuid> --page-size 500
# Supply the returned next_continuation_token explicitly to inspect another page.
```

The command intentionally has **no delete/apply mode**. An inventory snapshot
cannot prove that an in-flight confirmation will not subsequently commit a file
reference, or that the selected database represents all storage consumers. Object
age alone does not resolve that race. Live cleanup requires a reviewed inventory,
complete reference checks and either quiesced writers or a tested reservation/
quarantine protocol shared with upload finalization. Bucket versions, retention,
legal holds and KMS also require real storage validation. No automatic deletion,
lifecycle change or user-data mutation is performed by the audit.

Tests verify that only an old unreferenced confirmed copy is reported, both active
and soft-deleted references survive, recent/legacy objects are excluded, pagination
is exposed and no delete API is called. Live S3 inventory was not queried.

## Real authenticated browser flow

The production frontend build ran in Chromium against local HTTPS nginx, Daphne,
PostgreSQL 16 and Redis 7. The fixture uses a dedicated `.groven.localhost` domain,
a local test account and an eight-second JWT lifetime. Chromium trusts only the
fingerprint of the generated local TLS fixture; external browser requests and
service workers are blocked. API authentication and WebSocket traffic are real,
not mocked or fulfilled by the browser test.

Observed:

- Login API returned 200 and installed a Secure, HttpOnly refresh cookie; it was
  not visible through `document.cookie`.
- The authenticated dashboard loaded and a notification WebSocket connected.
- Token expiry caused a real cookie-based refresh and a second WebSocket with a
  different JWT; the browser remained on the authenticated dashboard.
- Removing the refresh cookie caused a subsequent refresh to return 401, clear
  the frontend session and redirect to login.
- No browser JavaScript exceptions occurred.

The checked-in browser report contains only statuses/counts/booleans, not tokens,
cookies or passwords. This is a provider-dashboard/feed rehearsal; chat UI,
multiple tenants/tabs, browser families, mobile behavior and production cookie/
proxy policies still need staging coverage.

### Reproduction outline

1. Start disposable PostgreSQL/Redis using the earlier integration instructions.
2. Run `python scripts/prepare-browser-session.py` with the test dependencies. It
   forces `config.browser_test_settings`, migrates the local database, creates the
   `.test` fixture account and generates local TLS/nginx fixtures under `/tmp`.
3. Run Daphne from `backend` with `DJANGO_SETTINGS_MODULE=config.browser_test_settings`,
   binding `0.0.0.0:59800`.
4. Build the frontend with `VITE_APP_DOMAIN=groven.localhost`, `VITE_PORT=59443`,
   `VITE_API_PORT=59443`, `VITE_API_BASE_URL=/api`, and
   `npm run build -- --outDir /tmp/groven-browser-dist`. Make only those generated
   static artifacts readable to nginx (`chmod -R a+rX /tmp/groven-browser-dist`).
5. Run nginx:alpine on loopback port 59443, mounting the generated default.conf,
   `/tmp/groven-browser-nginx` at `/fixtures`, and the built directory at
   `/usr/share/nginx/html`. Map `groven-backend` to the local workspace address
   reachable from that Docker network. In this managed environment Docker's
   default host-gateway pointed to a different namespace; the initial 502 was
   resolved by mapping the actual local workspace address. Do not use production
   hosts or alter the managed outbound proxy/network policy.
6. Set `GROVEN_BROWSER_SPKI` to the base64 SHA-256 of the certificate's DER public
   key and run `node scripts/check-browser-session.cjs`. It needs Playwright or a
   `PLAYWRIGHT_MODULE` path to playwright-core, and `/usr/bin/chromium`.
7. Stop Daphne and remove only the disposable test containers when finished.

## Actual PostgreSQL migration failure/recovery

A new regression test moves the disposable database to migration 0006, inserts a
legacy File, then injects a failure immediately after 0007's AddField executes.
It verifies that transactional DDL removed the added column, no successful
migration record was written, and the legacy row remained intact. Reapplying 0007
without the injected failure succeeds and preserves the legacy row with NULL
upload identity. This supplements the fake-Docker deployment ordering tests; it
is not an EC2 deployment rehearsal or proof of recovery for every migration type.

Full backend suite: **89 passed, 1 opt-in benchmark skipped**, with PostgreSQL,
Redis and real migrations. The frontend application code was unchanged in this
increment; the local production build and authenticated browser rehearsal passed.

## Remaining blockers and a newly observed risk

- **WebSocket JWT query strings can enter nginx access/error logs.** The local
  rehearsal exposed this behavior with disposable eight-second test tokens.
  The browser fixture suppresses WebSocket logs, but production transport/logging
  still needs a token-safe design and review. No actual token is included in the
  saved evidence. Blanket suppression is not claimed as a production fix.
- Storage audit/delete validation requires authorized S3 access and operational
  decisions about writer coordination, references, retention and versioning.
- Production environment reviewers, SSH host-key secret, migration window,
  backup/recovery approval and hosted CI visibility remain operator prerequisites.
- Real deployment/TLS/CDN behavior, multi-user load, cross-browser testing,
  payments, email and background-job recovery remain unverified.

Further live cleanup or deployed-workflow verification must wait for the relevant
credentials and operator decisions. These results do not certify production readiness.

The observed WebSocket query-token logging exposure is addressed by the
[credential transport and log-safety change](websocket-credential-transport.md),
which also documents rollout requirements and remaining infrastructure limits.
