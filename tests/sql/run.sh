#!/usr/bin/env bash
# Applies the migration to a throwaway Postgres and runs the sync tests against it.
set -euo pipefail
cd "$(dirname "$0")/../.."
PGBIN=${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}
DIR=$(mktemp -d)
PORT=${PGPORT_TEST:-55432}
cleanup() { "$PGBIN/pg_ctl" -D "$DIR" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT
RUNAS=()
if [ "$(id -u)" = "0" ]; then chown -R postgres "$DIR"; RUNAS=(runuser -u postgres --); fi
"${RUNAS[@]}" "$PGBIN/initdb" -D "$DIR" -U postgres --auth=trust >/dev/null
"${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$DIR" -o "-p $PORT -k $DIR -c listen_addresses=''" -w start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"
PSQL=("$PGBIN/psql" -h "$DIR" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q -X)
"${PSQL[@]}" -f tests/sql/stub_auth.sql
"${PSQL[@]}" -f supabase/migrations/0001_init.sql
"${PSQL[@]}" -f supabase/migrations/0001_init.sql   # safe to run twice
"${PSQL[@]}" -t -f tests/sql/test_sync.sql

# Every table: push one sample row, pull it back, validate with the app schemas.
PAYLOAD=$(npx tsx tests/sql/roundtrip.ts emit)
"${PSQL[@]}" -t -A -c "set role authenticated; set request.jwt.claim.sub = '00000000-0000-4000-8000-00000000000a'; select public.sync_push(\$json\$${PAYLOAD}\$json\$::jsonb)" >/dev/null
"${PSQL[@]}" -t -A -c "set role authenticated; set request.jwt.claim.sub = '00000000-0000-4000-8000-00000000000a'; select public.sync_pull(0, 1000)" | tail -1 | npx tsx tests/sql/roundtrip.ts check
