#!/usr/bin/env bash
# Schedules the DevGen backups on the server (run once as root; safe to re-run).
#   02:30 Lusaka (00:30 UTC) every night   backup-devegen.sh
#   03:30 Lusaka on the 1st of each month  restore-test-devegen.sh
#   11:30 Lusaka (09:30 UTC) every day      offsite-motogo.sh (after MotoGo's own
#                                           backup at about 08:38 UTC)
set -euo pipefail
DIR=$(cd "$(dirname "$0")" && pwd)
chmod 700 "$DIR/backup-devegen.sh" "$DIR/restore-test-devegen.sh" "$DIR/offsite-motogo.sh"

cat > /etc/cron.d/devegen-backup <<EOF
# DevGen database backups (installed by $DIR/install-backups.sh)
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
30 0 * * * root $DIR/backup-devegen.sh >> /var/log/devegen-backup.log 2>&1
30 1 1 * * root $DIR/restore-test-devegen.sh >> /var/log/devegen-backup.log 2>&1
30 9 * * * root $DIR/offsite-motogo.sh >> /var/log/devegen-backup.log 2>&1
EOF
chmod 644 /etc/cron.d/devegen-backup

cat > /etc/logrotate.d/devegen-backup <<'EOF'
/var/log/devegen-backup.log {
  monthly
  rotate 6
  compress
  missingok
  notifempty
}
EOF
echo "Scheduled: DevGen backup 00:30 UTC (02:30 Lusaka), restore test on the 1st at 01:30 UTC, MotoGo off-server copy 09:30 UTC (11:30 Lusaka)."
