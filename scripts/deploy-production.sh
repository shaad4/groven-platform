#!/usr/bin/env bash
# Explicit execution only. Run from the production checkout after reviewed SHA selection.
set -euo pipefail
if [[ ${1:-} != --execute || ${GROVEN_ALLOW_DEPLOY:-} != 1 ]]; then
  echo 'Refusing deployment: requires --execute and GROVEN_ALLOW_DEPLOY=1.' >&2
  exit 64
fi
compose=(docker compose)
"${compose[@]}" config --quiet
# Build and import/configuration checks happen before interrupting traffic.
"${compose[@]}" build backend daphne celery_worker celery_beat nginx
"${compose[@]}" up -d --wait postgres redis
"${compose[@]}" run --rm --no-deps backend python manage.py check --deploy --fail-level ERROR

maintenance=0
on_exit() {
  result=$?
  if [[ $maintenance == 1 ]]; then
    echo 'Deployment failed during maintenance. Stopping application services; inspect the migration and restore a reviewed compatible release manually.' >&2
    "${compose[@]}" stop --timeout 60 nginx backend daphne celery_worker celery_beat || true
  fi
  exit "$result"
}
trap on_exit EXIT
# Stop all application traffic and producers, preserving PostgreSQL/Redis.
# Stop workers before schema changes and prevent mixed WebSocket group versions.
maintenance=1
"${compose[@]}" stop --timeout 60 nginx backend daphne celery_worker celery_beat
"${compose[@]}" run --rm --no-deps backend python manage.py migrate --noinput
"${compose[@]}" run --rm --no-deps backend python manage.py migrate --check
"${compose[@]}" up -d --force-recreate --no-deps --wait backend daphne celery_worker celery_beat nginx
maintenance=0
"${compose[@]}" ps
