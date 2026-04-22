#!/bin/sh
set -e

# Initialize PostgreSQL data directory if needed
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  gosu postgres initdb --auth-host=md5 --auth-local=trust -U postgres
fi

# Start PostgreSQL
gosu postgres pg_ctl -D "$PGDATA" -l /tmp/postgres.log start

# Wait for PostgreSQL to be ready
until pg_isready -U postgres -q; do
  sleep 1
done

# Create database and set password
gosu postgres psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';" 2>/dev/null || true
gosu postgres psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='booking_service'" | grep -q 1 || \
  gosu postgres psql -U postgres -c "CREATE DATABASE booking_service;"

# Run Prisma migrations and seed
cd /app
npx prisma db push --accept-data-loss
npm run db:seed

# Start the application
exec npm start
