# Archived MySQL migrations

The database moved from MySQL (TiDB Cloud) to PostgreSQL. These migrations
are kept for history only; Prisma no longer reads this folder. The current
schema starts from `prisma/migrations/20261118000000_postgres_baseline`, and
existing data is copied with `scripts/copy-mysql-to-postgres.js`.
