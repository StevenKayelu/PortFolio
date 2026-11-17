#!/usr/bin/env bash
# Off-server copies of MotoGo's own daily backups (its backup container writes a
# database dump and a documents archive to the motolink_backups volume at about
# 08:38 UTC). Copies every file that isn't in the private "motogo-backups" R2
# bucket yet, applies retention there, and alerts the super admins if MotoGo's
# backup has stopped or a copy fails. MotoGo itself is only read, never changed.
set -Eeuo pipefail

SRC=/var/lib/docker/volumes/motolink_backups/_data
OFFSITE=(docker exec -i -e OFFSITE_SET=motogo devegen-api node scripts/offsite-backup.js)
log() { echo "$(date -u +%FT%TZ) motogo-offsite: $*"; }
fail() {
  log "FAILED: $1"
  docker exec devegen-api node scripts/offsite-backup.js notify "MotoGo off-server backup FAILED on $(hostname)" \
    "The MotoGo off-server backup failed at $(date -u +%FT%TZ) UTC: $1. Check /var/log/devegen-backup.log on the server." </dev/null || true
  exit 1
}
trap 'fail "unexpected error on line $LINENO"' ERR
exec 9>/run/motogo-offsite.lock
flock -n 9 || { log "already running; skipped"; exit 0; }

[ -d "$SRC" ] || fail "MotoGo's backup folder $SRC is missing"
NEWEST=$(find "$SRC" -maxdepth 1 -name 'motogo-*.dump' -printf '%T@ %f\n' | sort -n | tail -n 1 | cut -d' ' -f2-)
[ -n "$NEWEST" ] || fail "MotoGo has no database backups"
AGE_H=$(( ( $(date +%s) - $(stat -c %Y "$SRC/$NEWEST") ) / 3600 ))
[ "$AGE_H" -le 30 ] || fail "MotoGo's newest backup ($NEWEST) is $AGE_H hours old; its backup container may have stopped"

REMOTE=$("${OFFSITE[@]}" list </dev/null | awk '{print $1}')
COPIED=0
while IFS= read -r f; do
  name=$(basename "$f")
  grep -qxF "$name" <<<"$REMOTE" && continue
  # Only files that finished writing (older than 10 minutes) and read back cleanly.
  [ $(( $(date +%s) - $(stat -c %Y "$f") )) -ge 600 ] || continue
  case "$name" in
    *.dump) [ "$(head -c 5 "$f")" = "PGDMP" ] || fail "$name is not a PostgreSQL dump" ;;
    *.tar.gz) gzip -t "$f" || fail "$name is a damaged archive" ;;
  esac
  "${OFFSITE[@]}" upload "$name" < "$f" >/dev/null || fail "copying $name to R2 failed"
  COPIED=$((COPIED + 1))
done < <(find "$SRC" -maxdepth 1 -type f \( -name 'motogo-*.dump' -o -name 'motogo-documents-*.tar.gz' \) | sort)

"${OFFSITE[@]}" prune </dev/null >/dev/null || fail "pruning old off-server copies failed"
log "copied $COPIED new file(s); newest MotoGo backup $NEWEST (${AGE_H}h old)"
