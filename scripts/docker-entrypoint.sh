#!/bin/sh
set -e

echo "Waiting for database..."
node scripts/wait-for-db.mjs

echo "Running database migrations..."
node scripts/migrate.mjs

echo "Starting TrendHunter..."
exec "$@"
