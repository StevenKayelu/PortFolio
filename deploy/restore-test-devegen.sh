#!/usr/bin/env bash
# Proves the backups can be restored: downloads the newest OFF-SERVER copy,
# restores it into a temporary database, compares every table's row count
# with the live database, then drops the temporary database.
# Runs monthly (deploy/install-backups.sh) and can be run by hand at any time.
# The live database is only read, never changed.
set -Eeuo pipefail
export LC_ALL=C

TEST_DB=devegen_restore_check
WORK=$(mktemp -d)
log() { echo "$(date -u +%FT%TZ) restore-test: $*"; }
psql_super() { docker exec -i motolink-postgres-1 psql -U motolink -d postgres -v ON_ERROR_STOP=1 -Atq "$@"; }
counts() {
  docker exec motolink-postgres-1 psql -U motolink -d "$1" -Atq -c \
    "select format('select %L || '' '' || count(*) from %I', table_name, table_name) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' and table_name <> '_prisma_migrations' order by 1" </dev/null \
    | docker exec -i motolink-postgres-1 psql -U motolink -d "$1" -Atq | sort
}
cleanup() { psql_super -c "DROP DATABASE IF EXISTS $TEST_DB WITH (FORCE)" </dev/null >/dev/null 2>&1 || true; rm -rf "$WORK"; }
fail() {
  log "FAILED: $1"
  cleanup
  docker exec devegen-api node scripts/offsite-backup.js notify "DevGen restore test FAILED on $(hostname)" \
    "The monthly restore test failed at $(date -u +%FT%TZ) UTC: $1. Check /var/log/devegen-backup.log on the server." </dev/null || true
  exit 1
}
trap 'fail "unexpected error on line $LINENO"' ERR
trap cleanup EXIT

NAME=$(docker exec devegen-api node scripts/offsite-backup.js list </dev/null | head -1 | awk '{print $1}')
[ -n "$NAME" ] || fail "no off-server backup found"
docker exec devegen-api node scripts/offsite-backup.js download "$NAME" </dev/null > "$WORK/$NAME" || fail "download of $NAME failed"
log "downloaded $NAME from R2 ($(du -h "$WORK/$NAME" | cut -f1))"

psql_super -c "DROP DATABASE IF EXISTS $TEST_DB WITH (FORCE)" </dev/null
psql_super -c "CREATE DATABASE $TEST_DB" </dev/null
docker exec -i motolink-postgres-1 pg_restore -U motolink -d "$TEST_DB" --no-owner --exit-on-error < "$WORK/$NAME" || fail "pg_restore failed"

counts "$TEST_DB" > "$WORK/restored.txt"
counts devegen > "$WORK/live.txt"
TABLES=$(wc -l < "$WORK/restored.txt")
ROWS=$(awk '{s += $2} END {print s + 0}' "$WORK/restored.txt")
LIVE_ROWS=$(awk '{s += $2} END {print s + 0}' "$WORK/live.txt")
# Every live table must exist in the restore. Row counts drift a little between the
# backup and now (new visits and leads, pruned records), so only a large shortfall fails.
MISSING=$(cut -d' ' -f1 "$WORK/live.txt" | comm -23 - <(cut -d' ' -f1 "$WORK/restored.txt") | tr '
' ' ')
[ -z "$MISSING" ] || fail "tables missing from the restore: $MISSING"
[ "$ROWS" -ge $(( LIVE_ROWS * 9 / 10 )) ] || fail "the restore has $ROWS rows but the live database has $LIVE_ROWS"
CHANGED=$(join "$WORK/live.txt" "$WORK/restored.txt" | awk '$2 != $3 {printf "%s %+d, ", $1, $2 - $3}')
log "OK: $NAME restored $TABLES tables, $ROWS rows (live now: $LIVE_ROWS)${CHANGED:+; changed since the backup: ${CHANGED%, }}"
