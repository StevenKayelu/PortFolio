#!/usr/bin/env bash
# Schedules the DevGen backups on the server (run once as root; safe to re-run).
#   02:30 Lusaka (00:30 UTC) every night   backup-devegen.sh
#   03:30 Lusaka on the 1st of each month  restore-test-devegen.sh
# MotoGo's own backup runs at 08:38 UTC, so the two never overlap.
set -euo pipefail
DIR=$(cd "$(dirname "$0")" && pwd)
chmod 700 "$DIR/backup-devegen.sh" "$DIR/restore-test-devegen.sh"

cat > /etc/cron.d/devegen-backup <<EOF
# DevGen database backups (installed by $DIR/install-backups.sh)
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
30 0 * * * root $DIR/backup-devegen.sh >> /var/log/devegen-backup.log 2>&1
30 1 1 * * root $DIR/restore-test-devegen.sh >> /var/log/devegen-backup.log 2>&1
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
echo "Scheduled: nightly backup 00:30 UTC (02:30 Lusaka), restore test on the 1st at 01:30 UTC."
