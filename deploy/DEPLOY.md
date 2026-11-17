# Moving the Devegen API to the MotoGo server

From: Render (API) + TiDB Cloud in Frankfurt (MySQL).
To: a container on the MotoGo server in Johannesburg, using its own database on
MotoGo's PostgreSQL, behind MotoGo's Caddy. The website itself stays on Vercel.

```
Browser ──► stevenkayelu.online / devegenventures.com      (Vercel, static)
   └────► api.stevenkayelu.online / api.devegenventures.com (MotoGo's Caddy, HTTPS)
               └──► devegen-api container (320 MB limit) ──► Postgres DB "devegen"
```

Render and TiDB stay untouched as a fallback until step 11. In the commands
below, `motogo-vps` is the SSH alias for the server.

---

## 0. Before you start

- [ ] Leaked credentials rotated (DB password, R2 keys); see the pull request.
- [ ] **Render → API service → Settings → Auto-Deploy: Off.** Render must keep running
      today's code as the fallback; merging to `main` would otherwise make it rebuild
      with PostgreSQL code against TiDB.
- [ ] In your DNS, lower the TTL of the records you'll add or change to 300 seconds.
- [ ] Choose a quiet hour for steps 6–9 (the data copy and the switch).

## 1. Check the server

```bash
ssh motogo-vps
docker network ls | grep motolink              # expect motolink_default
docker exec motolink-postgres-1 printenv POSTGRES_USER     # Postgres superuser name
docker exec motolink-postgres-1 psql -U <that user> -d postgres -c \
  "SELECT datname, pg_get_userbyid(datdba) AS owner FROM pg_database;"
free -m
```

If the network isn't `motolink_default`, change `networks.motolink.name` in
`deploy/docker-compose.yml`. MotoGo must connect as the **owner** of `motolink`
(step 3 removes everyone else's default access).

## 2. Get the code onto the server

```bash
git clone https://github.com/StevenKayelu/PortFolio.git /root/devegen
cd /root/devegen && git checkout infra/postgres-vultr   # `main` once merged
```

## 3. Create Devegen's database and login

```bash
cd /root/devegen/deploy
PW=$(openssl rand -hex 24); echo "Save this password: $PW"
sed "s/CHANGE_ME/$PW/" postgres-setup.sql \
  | docker exec -i motolink-postgres-1 psql -U <superuser> -d postgres -v ON_ERROR_STOP=1
```

Check MotoGo still works (open the app, or `docker logs --tail 20 motolink-backend-1`).

## 4. Configuration

```bash
cp env.production.example .env.production && chmod 600 .env.production
nano .env.production    # DATABASE_URL password from step 3, new JWT secrets, R2 keys, R2_PRIVATE_BUCKET
```

## 5. Build and create the tables

```bash
docker compose build
docker compose run --rm devegen-api npx prisma migrate deploy
```

## 6. Copy the live data from TiDB

Type the TiDB connection string without it landing in shell history:

```bash
read -rs SRC && export SOURCE_DATABASE_URL="$SRC" && unset SRC
docker compose run --rm -e SOURCE_DATABASE_URL devegen-api node scripts/copy-mysql-to-postgres.js --dry-run
docker compose run --rm -e SOURCE_DATABASE_URL devegen-api node scripts/copy-mysql-to-postgres.js
docker compose run --rm devegen-api node prisma/seed-ecosystem.js
unset SOURCE_DATABASE_URL
```

The copy prints a table of row counts per table and stops if anything differs.
It doesn't copy sign-in sessions (everyone signs in again) or the two placeholder
certificates. It refuses to run into a database that already has data; to retry,
drop and recreate the `devegen` database (step 3) and repeat steps 5–6.

## 7. Start the API

```bash
docker compose up -d
docker compose ps                       # devegen-api: healthy
docker stats --no-stream                # devegen-api well under 320 MiB; MotoGo unchanged
```

## 8. HTTPS and DNS

1. Add the block in `deploy/Caddyfile.devegen` to MotoGo's
   `infrastructure/production/Caddyfile`, then rebuild and restart MotoGo's Caddy
   your usual way.
2. DNS: `A` records for `api.stevenkayelu.online` and `api.devegenventures.com`
   pointing to the server (plus `AAAA` if it has IPv6).
3. Test from your computer:
   ```
   curl https://api.stevenkayelu.online/api/v1/health
   curl https://api.devegenventures.com/api/v1/ecosystem
   ```

## 9. Switch the website over

1. Merge the pull request(s) into `main`.
2. **Vercel → Project → Settings → Environment Variables → Production:** delete
   `VITE_API_URL`. With it unset, each site uses `api.<its own domain>`.
3. Redeploy production on Vercel.
4. Check: both home pages, the ecosystem map, `/certificates`, `/compliance`,
   a contact-form message, and admin sign-in → Leads.

**Rollback** at any point before step 11: set `VITE_API_URL` back to
`https://steven-kayelu.onrender.com/api/v1` on Vercel and redeploy. Anything
written to the new database since the switch (messages, edits) won't be in TiDB.

Messages sent to the old API between step 6 and step 9 aren't copied. Check
TiDB's `contact_messages` once after the switch and re-enter any new ones.

## 10. Backups

```bash
chmod +x /root/devegen/deploy/backup-devegen.sh
/root/devegen/deploy/backup-devegen.sh && ls -lh /root/backups/devegen
( crontab -l 2>/dev/null; echo "30 2 * * * /root/devegen/deploy/backup-devegen.sh" ) | crontab -
```

Test a restore once (into a scratch database, never over the live one):

```bash
docker exec motolink-postgres-1 createdb -U <superuser> restore_test
gunzip -c /root/backups/devegen/$(ls -t /root/backups/devegen | head -1) \
  | docker exec -i motolink-postgres-1 psql -U <superuser> -d restore_test -q
docker exec motolink-postgres-1 psql -U <superuser> -d restore_test -c "SELECT count(*) FROM projects;"
docker exec motolink-postgres-1 dropdb -U <superuser> restore_test
```

Optional off-server copies: install `rclone`, add a remote named `r2-private` for
the private R2 bucket, and the script uploads each backup automatically.

## 11. After a week without problems

- Suspend the Render service, then delete it.
- Download a final export of the TiDB database for your records, then delete it.
- Remove the Render URL from anything that still mentions it.

## Server checks (once)

```bash
ufw status                 # allow only 22, 80, 443
sshd -T | grep -E 'passwordauthentication|permitrootlogin'   # no / prohibit-password
systemctl status unattended-upgrades
```

## Updating later

```bash
cd /root/devegen && git pull
cd deploy && docker compose build
docker compose run --rm devegen-api npx prisma migrate deploy
docker compose up -d
```
