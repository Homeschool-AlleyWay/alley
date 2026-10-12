#!/usr/bin/env bash
# Runs every migration and the RLS tests on a throw-away local Postgres (no Supabase needed).
# Usage: supabase/tests/run_local.sh   (needs a running Postgres and a user that can create databases; set PGHOST/PGUSER as usual)
set -euo pipefail
cd "$(dirname "$0")/.."
DB="unify_test_$$"
psql -qv ON_ERROR_STOP=1 -d postgres -c "create database $DB" >/dev/null
trap 'psql -q -d postgres -c "drop database if exists $DB" >/dev/null' EXIT
run() { psql -qv ON_ERROR_STOP=1 -d "$DB" -f "$1" >/dev/null; }
run tests/local_stub.sql
for m in migrations/*.sql; do echo "migration $m"; run "$m"; done
rc=0
for t in tests/*_rls.sql tests/apps_mail_kid_login.sql; do
  echo "== $t"
  out=$(psql -qtAv ON_ERROR_STOP=0 -d "$DB" -f "$t" 2>&1 || true)
  echo "$out" | sed -n '/RESULTS/,$p' | grep -E '^(PASS|FAIL)' || { echo "$out" | tail -20; rc=1; }
  if echo "$out" | grep -q '^FAIL'; then rc=1; fi
done
exit $rc
