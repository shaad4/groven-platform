# Socket revocation and upload concurrency

Changes are on `optimize/production-readiness`; no merge, deployment, production
service access or retry of the denied Actions API was performed.

## Live socket authorization

Chat and notification consumers now query current authorization before processing
inbound messages and before delivering group events. Inactive memberships/users,
inactive or suspended workspaces, deleted requests/clients, and changed client
ownership deny chat access. Database authorization failures fail closed. A denied
connection leaves its group and closes with code 4003; subsequent events are
ignored. Frontend reconnect logic stops for 4003 and 4004 instead of repeatedly
retrying a permanently denied connection.

This is event-driven revocation, not polling: an idle socket may remain open until
its next event, but that event is reauthorized before processing or delivery.
Each chat event performs a membership lookup and a request lookup; feed events
perform a membership existence check. Authorization is deliberately not cached.
Already-sent messages cannot be recalled, and there remains an ordinary race
between the authorization read and the network send. No strict simultaneous
revocation/transport guarantee is claimed. Existing JWTs are verified at connection
time; timer-driven expiry of otherwise authorized idle sessions is not added here.

Notification channel groups now include both workspace and user IDs. A user with
memberships in two workspaces receives each workspace's events only on its
corresponding connection. Deploying this group-name change requires restarting
all WebSocket workers and event producers; mixed versions can miss live updates.
Persisted notifications remain available through HTTP.

## Upload confirmation

The service verifies S3 before opening a transaction, then locks the request row
while checking for a previous confirmation, creating the file and recording its
activity. Simultaneous retries return the same file and do not duplicate activity.
Signed upload nonces are stored in a nullable, database-unique UUID `upload_id`.
Legacy files retain NULL; no data is deleted or deduplicated by the migration.
Deleted uploads cannot be registered again by replaying their confirmation.

File creation and activity creation roll back together. Activity broadcasts run
only after transaction commit, avoiding events for rolled-back registrations.
The row lock serializes confirmations for the same request, including distinct
files. S3 network calls happen outside that lock. Uniqueness covers new signed
upload identities; legacy rows and arbitrary direct database writes with NULL
identities are not retroactively deduplicated. Presigned S3 POST reuse/overwrite
within its lifetime, malware scanning, and quota enforcement remain separate risks.

## Evidence

- PostgreSQL 16 + Redis 7 suite, real migrations: **83 passed, 1 skipped**. The
  skipped case is the opt-in performance benchmark.
- Twelve incoming/outgoing chat revocation cases cover membership removal,
  user deactivation, workspace deactivation/suspension, ownership change and
  request deletion. Notification tests cover revocation and cross-workspace
  isolation for the same user.
- Four concurrent confirmations on separate PostgreSQL connections all return
  one file ID, with one file and one activity row. A separate test verifies the
  database uniqueness constraint directly.
- Failed activity insertion rolls back file creation and emits no activity.
- Migration regression moves from 0006 to 0007 with duplicate legacy keys and
  verifies that both legacy rows remain intact with NULL upload identities.
- Frontend: **28 tests passed**; lint **0 errors, 143 warnings**; production build
  passed. `makemigrations --check --dry-run` reports no changes.

Commands and disposable services are documented in
[integration-performance-results.md](integration-performance-results.md).

## Release prerequisites and remaining blockers

1. Apply `request_management.0007_file_upload_id` before starting the new backend.
   The existing deployment workflow does **not** run migrations automatically.
   Review this additive migration on staging with representative table size and
   lock timing. Do not merge directly into the auto-deployed develop branch until
   migration and deployment ordering are planned.
2. Restart backend, WebSocket workers and event producers together so feed group
   naming is consistent. Verify reconnect and missed-update recovery in staging.
3. Real S3 credentials are unavailable here. IAM/HeadObject access, bucket CORS,
   object overwrite protection, quotas and scanning require staging verification.
4. Authenticated multi-user browser/load tests, real email/payments/background jobs,
   deployed TLS/CDN/proxy routing and production p95/p99 timings remain unverified.
5. Remote CI results remain unavailable due to the prior Actions API denial.
   Local checks do not establish that hosted CI passed.

These changes close the tested risks; they do not establish complete production
readiness.
