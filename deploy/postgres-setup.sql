-- Creates Devegen's own database and login on MotoGo's PostgreSQL.
-- Run once, as MotoGo's "motolink" login, which is the server's superuser
-- (POSTGRES_USER in MotoGo's compose file). See DEPLOY.md step 3.
-- Replace CHANGE_ME with a long random password before running.
--
-- Isolation: by default PostgreSQL lets every login CONNECT to every
-- database. These statements remove that, so the devegen login can't open
-- MotoGo's database. (MotoGo's "motolink" login is the superuser, so it can
-- still reach every database on this server; both are yours.)

CREATE ROLE devegen LOGIN PASSWORD 'CHANGE_ME' CONNECTION LIMIT 10;
CREATE DATABASE devegen OWNER devegen ENCODING 'UTF8' TEMPLATE template0;

REVOKE CONNECT ON DATABASE devegen FROM PUBLIC;
GRANT CONNECT ON DATABASE devegen TO devegen;

-- MotoGo connects as "motolink", the superuser and owner of its database, so
-- removing PUBLIC access doesn't affect MotoGo; it only stops the devegen
-- login from opening MotoGo's data.
REVOKE CONNECT ON DATABASE motolink FROM PUBLIC;
