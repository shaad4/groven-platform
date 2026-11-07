# Integration and performance follow-up

These checks ran in disposable local containers, not production. No merge or
deployment was performed. The existing Actions API denial was not retried.

## Verified behavior

- 63 backend tests passed against PostgreSQL 16 and Redis 7 with real migrations
  (`--migrations`, overriding the repository's default `--nomigrations`). One
  opt-in benchmark was skipped. AI, email, Stripe and S3 calls remain mocked.
- An added integration test authenticates a WebSocket with JWT and workspace
  membership, sends a message through the HTTP endpoint, and asserts that Redis
  delivers the message to the receiving client's WebSocket.
- `makemigrations --check --dry-run` reports no model/migration drift.
- `gunicorn config.wsgi:application --check-config` succeeds with an empty optional
  Groq key. Previously importing the AI module raised OpenAIError. AI providers
  now initialize lazily and missing configuration raises an AIServiceError only
  when that provider is needed. Two new tests verify absence and reuse behavior.
- Full production nginx configuration passes `nginx -t` in nginx:alpine with
  disposable self-signed certificate fixtures and local upstream name mappings.
  This validates syntax, not real certificates or upstream reachability.
- `/sw.js` previously returned 404 despite the file existing. Setting the frontend
  server's document root fixes it: HTTP 200, application/javascript, with existing
  no-cache/no-store headers retained.
- A redundant 370,819-byte favicon reference (incorrectly labeled SVG) was removed;
  the existing 2,358-byte 32x32 PNG remains. The production build still passes.

## Measurements

PostgreSQL query + serializer timing, with 500 synthetic requests and one file
per request. Six measured samples per variant after warmup, database local, no
network or HTTP middleware included. The baseline reproduces the previous query
shape; this is not a comparison between two deployed application versions.

| Returned requests | SQL queries before / after | Median before | Median after |
| --- | --- | --- | --- |
| 50 | 51 / 1 | 39.39 ms | 8.25 ms |
| 500 | 501 / 1 | 363.97 ms | 34.24 ms |

Browser: Chromium 156, login page, six alternating cold-cache runs per variant,
200,000 bytes/sec download (~1.6 Mbps), 100 ms latency, 4x CPU slowdown. The same
built assets were served by nginx with baseline versus updated gzip scope.
Authentication and tenant bootstrap responses were stubbed; external traffic and
service workers were blocked. The login form was asserted visible and no
JavaScript errors occurred. This isolates static delivery and rendering, not
real sign-in, authenticated dashboards, or production latency.

| Metric | Before compression | After compression |
| --- | --- | --- |
| Median first contentful paint | 3,164 ms | 1,398 ms |
| Median largest contentful paint | 3,618 ms | 1,846 ms |
| Median DOM content loaded | 3,089.7 ms | 1,318.4 ms |
| Asset resource transfer bytes | 855,967 | 497,345 |

Direct main-JS response: 420,952 bytes uncompressed versus 160,315 gzip bytes
(~62% reduction), with `Vary: Accept-Encoding`. nginx's default compression level
differs from Vite's gzip size estimate. Browser results precede favicon removal;
no extra latency benefit is claimed for that removal.

Raw samples: [request lists](benchmarks/request-list.json),
[browser comparison](benchmarks/login-compression.json).

## Reproduce safely

Use a disposable environment with Docker. These ports and credentials are solely
for local testing; do not point the settings at production.

```sh
docker run -d --rm --name groven-check-postgres -p 127.0.0.1:55432:5432 \
  -e POSTGRES_DB=groven_check -e POSTGRES_USER=groven_check \
  -e POSTGRES_PASSWORD=local-test-only --tmpfs /var/lib/postgresql/data postgres:16
docker run -d --rm --name groven-check-redis -p 127.0.0.1:56379:6379 redis:7-alpine
cd backend
pip install -r requirements-test.txt
pytest --ds=config.integration_test_settings --migrations --no-cov -q
GROVEN_BENCHMARK=1 pytest benchmarks --ds=config.integration_test_settings --migrations --no-cov -q -s
```

For browser checks, build the frontend, then from the repository root:

```sh
python scripts/prepare-nginx-benchmark.py
# Serve identical assets with two HTTP-only nginx fixtures:
docker run -d --rm --name groven-check-nginx-before --add-host backend:127.0.0.1 \
  -p 127.0.0.1:58081:80 \
  -v /tmp/groven-nginx-check/before.conf:/etc/nginx/conf.d/default.conf:ro \
  -v /tmp/groven-nginx-check/dist:/usr/share/nginx/html:ro nginx:alpine
docker run -d --rm --name groven-check-nginx-after --add-host backend:127.0.0.1 \
  -p 127.0.0.1:58082:80 \
  -v /tmp/groven-nginx-check/after.conf:/etc/nginx/conf.d/default.conf:ro \
  -v /tmp/groven-nginx-check/dist:/usr/share/nginx/html:ro nginx:alpine
# Requires Playwright (or PLAYWRIGHT_MODULE pointing to playwright-core)
# and Chromium at /usr/bin/chromium:
node scripts/benchmark-login.cjs
# Remove only these disposable services after checks:
docker stop groven-check-nginx-before groven-check-nginx-after groven-check-postgres groven-check-redis
```

CI now declares PostgreSQL/Redis services and runs the backend suite with real
migrations. Remote CI results remain unverified because Actions API access was
denied previously; local checks do not prove the hosted job has passed.

## Remaining release blockers and risks

- No real S3 credentials configured: IAM/HeadObject permissions, bucket CORS,
  upload/download integration, quotas and scanning require staging checks.
- No production or staging credentials/data: authenticated browser workflows,
  multi-user load, background jobs, email/payment integrations and production
  p95/p99 latency are not verified.
- Socket revocation checks were added in the subsequent [security follow-up](security-hardening-followup.md).
- Concurrent upload confirmations now have locking and database uniqueness; see
  the security follow-up and migration requirement. Presigned POST reuse within
  its lifetime remains possible.
- Real TLS, CDN/proxy behavior and API/WebSocket routing require deployment-level
  validation. The checks here neither deploy nor certify production readiness.
