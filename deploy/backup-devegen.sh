#!/usr/bin/env bash
# Nightly backup of the DevGen database (scheduled by deploy/install-backups.sh).
#  1. pg_dump (custom format, compressed) through MotoGo's Postgres container
#  2. checks the dump can be read by pg_restore before keeping it
#  3. keeps 14 days on the server (/root/backups/devegen, root only)
#  4. copies it off the server to the private R2 bucket (30 recent + 12 monthly)
# Any failure emails the super admins (through the API's mail settings).
set -Eeuo pipefail

BACKUP_DIR=/root/backups/devegen
KEEP_DAYS=14
NAME="devegen-$(date -u +%Y%m%dT%H%M%SZ).dump"
FILE="$BACKUP_DIR/$NAME"
log() { echo "$(date -u +%FT%TZ) backup: $*"; }

fail() {
  log "FAILED: $1"
  rm -f "$FILE.partial"
  docker exec devegen-api node scripts/offsite-backup.js notify \
    "DevGen backup FAILED on $(hostname)" \
    "The nightly database backup failed at $(date -u +%FT%TZ) UTC: $1. Check /var/log/devegen-backup.log on the server." </dev/null || true
  exit 1
}
trap 'fail "unexpected error on line $LINENO"' ERR

# One run at a time.
exec 9>/run/devegen-backup.lock
flock -n 9 || { log "another backup is running; skipped"; exit 0; }

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

docker exec motolink-postgres-1 pg_dump -U devegen -d devegen --format=custom --compress=6 --no-owner </dev/null > "$FILE.partial" \
  || fail "pg_dump did not finish"
[ "$(head -c 5 "$FILE.partial")" = "PGDMP" ] || fail "the dump is not a PostgreSQL backup"
TABLES=$(docker exec -i motolink-postgres-1 pg_restore --list < "$FILE.partial" | grep -c " TABLE DATA ") || fail "pg_restore can't read the dump"
[ "$TABLES" -ge 30 ] || fail "the dump has only $TABLES tables"
mv "$FILE.partial" "$FILE"
chmod 600 "$FILE"
log "wrote $NAME ($(du -h "$FILE" | cut -f1), $TABLES tables)"

find "$BACKUP_DIR" -name 'devegen-*.dump' -mtime +"$KEEP_DAYS" -delete

docker exec -i devegen-api node scripts/offsite-backup.js upload "$NAME" < "$FILE" || fail "the off-server copy (R2) failed"
docker exec devegen-api node scripts/offsite-backup.js prune </dev/null || fail "pruning old off-server copies failed"
log "done"
