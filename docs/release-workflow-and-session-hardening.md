# Prepared release workflow, upload finalization and session expiry

No merge, deployment, production access or Actions API retry was performed.

## Deployment behavior change

Production deployment is now **manual only**, replacing the previous automatic
`develop` push trigger. The workflow must be dispatched from `develop` with a full,
reviewed commit SHA. It runs the reusable backend/frontend checks against that SHA
before entering the `production` environment. The server verifies that the SHA is
an ancestor of `origin/develop` and refuses to overwrite tracked local changes.
Deployments are serialized; a running deployment is never automatically cancelled.

The remote script:

1. Validates Compose, builds images, starts/waits for database/cache services and
   runs Django's deployment checks before stopping application traffic.
2. Stops nginx, HTTP backend, WebSocket workers, Celery workers and scheduler with
   a 60-second shutdown grace period. PostgreSQL and Redis remain running.
3. Runs migrations and checks that no migrations remain pending.
4. Recreates all application services together from the new images.

This uses a maintenance window, not a zero-downtime migration scheme. Long-running
jobs can exceed the shutdown grace period; queue/task recovery must be reviewed.
A failed migration does not restart the application. If recreation partially
fails, the script attempts to stop all application services and exits with the
original failure. It does not guess at schema rollback or restore an incompatible
application automatically. Compose `--wait` only proves running/healthy according
to configured healthchecks; the current stack lacks end-to-end readiness checks.
Operators still need a staging rehearsal and post-release smoke checks.

The script refuses to execute without both `--execute` and
`GROVEN_ALLOW_DEPLOY=1`. Its tests use a fake Docker executable and never deploy.

### Required operator setup before any release

- Configure required reviewers/protected branches for GitHub's `production`
  environment. Merely naming the environment in YAML does **not** enforce review.
- Set `EC2_HOST`, `EC2_USERNAME`, `EC2_SSH_KEY`, and the new `EC2_KNOWN_HOSTS`
  secret, using a host key verified through a trusted channel. Host-key checking
  is strict; no trust-on-first-use or insecure fallback is provided.
- Confirm the existing server checkout path `~/grove-platform`, Docker Compose
  support for `--wait`, available disk space, database backups and recovery plan.
- Review migration `0007_file_upload_id`, its lock/index cost on representative
  data, the maintenance window, and background-task recovery. The prepared script
  applies migrations before starting new application code.
- Review S3 permissions/lifecycle requirements below before releasing upload code.

No GitHub environment settings/secrets have been created or changed by this work.
Remote CI status remains unverified because the previously denied Actions API was
not retried.

## Presigned upload overwrite protection

New upload URLs target `staging/tenants/...`. Confirmation checks the signed
metadata and S3 object metadata, then conditionally copies the source into a fresh
`tenants/.../confirmed/<upload-id>/<random-attempt-id>` key. The CopyObject request
uses the source ETag (`CopySourceIfMatch`) and pins VersionId when available. MIME
metadata is replaced with the verified content type. A changed source or failed
copy fails confirmation rather than registering unchecked content.

Client POSTs cannot write the confirmed key through the issued upload policy.
Reusing the staging upload URL therefore cannot overwrite the registered download.
Every competing confirmation uses its own destination; a concurrent loser cannot
overwrite the winning object's contents. The database lock/unique upload identity
still selects exactly one file and activity record. Sequential retries reuse the
registered file. Legacy signed staging keys remain accepted during their validity
window; already-registered legacy files are not copied or altered retroactively.

### Storage release prerequisites and limitations

- The backend needs source GetObject/GetObjectVersion (if versioned) and destination
  PutObject permissions, plus any KMS permissions required by bucket encryption.
  Existing presigned upload policies may need the new `staging/` prefix allowed.
- Configure a reviewed lifecycle for the **staging/** prefix, allowing more than
  the 15-minute confirmation validity window. No bucket policy is changed here.
- Failed database writes and simultaneous confirmations can leave unreferenced
  confirmed copies. Reconcile those against database references before deletion.
  **Do not apply a blanket expiration rule to confirmed objects.** An automated
  orphan collector is not implemented without real storage/inventory validation.
- S3 writes and database transactions cannot be committed atomically. Copying adds
  a storage operation and latency; actual IAM, KMS, CORS, cost, object-version and
  performance behavior still require staging validation. No live S3 credentials
  are configured in this environment.
- This prevents overwrite through issued upload URLs, not arbitrary writes by
  privileged bucket credentials. Quotas, malware scanning and privileged storage
  access controls remain release work.

## Idle token expiry and frontend recovery

The WebSocket middleware passes JWT expiry into consumer scope. After acceptance,
a timer queues closure at expiry (code 4008) even without traffic. Dispatch also
checks expiry before processing events; timers are cancelled on disconnect.
Authorization revocation checks from the prior change remain in place. Timer
scheduling/Redis outages or busy event loops can delay idle closure; no hard
real-time deadline is claimed.

Chat and notification feeds now share the tested WebSocket hook. On expiry they
refresh through the HTTP-only cookie and reconnect through the updated Redux token.
Concurrent socket refresh requests share one in-flight refresh. A late response
cannot restore a logged-out session or replace a newer token. Temporary network
failures retry with backoff; 401/403 clears the matching session. Tokens already
expired after an offline period are refreshed before reconnecting. Ordinary
access-denial closes stop retrying rather than producing a reconnection loop.

## Validation

- PostgreSQL 16 / Redis 7, real migrations: **86 tests passed, 1 opt-in benchmark
  skipped**. Includes idle expiry without traffic, conditional-copy failure,
  staging replay preserving registered bytes and four-way confirmation races.
- Frontend: **33 tests passed**; production build passed; lint has **0 errors and
  141 warnings**. Tests cover shared refresh, logout races, revoked access, expired
  URL handling and stale connection events.
- Deployment: **6 fake-Docker orchestration tests passed**, including failed
  build/preflight, failed migration and partially failed restart. Shell syntax
  validation and YAML parsing passed. Hosted GitHub execution was not tested.

```sh
python -m unittest discover -s scripts/tests -v
bash -n scripts/deploy-production.sh
# With disposable PostgreSQL/Redis as documented previously:
cd backend
pytest --ds=config.integration_test_settings --migrations --no-cov -q
```

Live S3 integration, authenticated browser cookie/reconnect flows, real deployments,
production load and hosted CI still require verification. These changes are
prepared and locally tested, not proof of production readiness.

Later verification: [read-only upload audit, authenticated browser refresh and migration recovery](upload-audit-browser-and-recovery.md).
