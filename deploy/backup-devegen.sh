#!/usr/bin/env bash
# Nightly backup of the Devegen database (run from root's crontab, see DEPLOY.md).
# Keeps 14 days on the server; if rclone is configured with a remote named
# "r2-private", also copies each backup off the server.
set -euo pipefail

BACKUP_DIR=/root/backups/devegen
KEEP_DAYS=14
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
FILE="$BACKUP_DIR/devegen-$STAMP.sql.gz"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# Dump through MotoGo's Postgres container over its local socket, as the
# devegen login (the official image trusts local-socket connections).
docker exec motolink-postgres-1 pg_dump -U devegen -d devegen --no-owner --format=plain \
  | gzip -9 > "$FILE.partial"
mv "$FILE.partial" "$FILE"
chmod 600 "$FILE"

# Refuse to keep an obviously broken dump.
if [ "$(gzip -dc "$FILE" | head -c 2000 | grep -c 'PostgreSQL database dump')" -eq 0 ]; then
  echo "Backup $FILE looks invalid" >&2
  exit 1
fi

find "$BACKUP_DIR" -name 'devegen-*.sql.gz' -mtime +"$KEEP_DAYS" -delete

if command -v rclone >/dev/null 2>&1 && rclone listremotes | grep -q '^r2-private:'; then
  rclone copy "$FILE" r2-private:devegen-backups/ --quiet
fi
