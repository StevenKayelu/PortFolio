-- Creates Devegen's own database and login on MotoGo's PostgreSQL.
-- Run once, as the Postgres superuser (see DEPLOY.md step 3).
-- Replace CHANGE_ME with a long random password before running.
--
-- Isolation: by default PostgreSQL lets every login CONNECT to every
-- database. These statements remove that, so the devegen login can't open
-- MotoGo's database and MotoGo's login can't open Devegen's.

CREATE ROLE devegen LOGIN PASSWORD 'CHANGE_ME' CONNECTION LIMIT 10;
CREATE DATABASE devegen OWNER devegen ENCODING 'UTF8' TEMPLATE template0;

REVOKE CONNECT ON DATABASE devegen FROM PUBLIC;
GRANT CONNECT ON DATABASE devegen TO devegen;

-- MotoGo's database is named "motolink" (from the server's process list).
-- Its owner keeps access; other logins lose the default PUBLIC access.
-- Check first that MotoGo connects as the database OWNER:
--   SELECT datname, pg_get_userbyid(datdba) FROM pg_database WHERE datname = 'motolink';
REVOKE CONNECT ON DATABASE motolink FROM PUBLIC;
