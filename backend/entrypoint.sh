#!/bin/bash
set -e

echo "--- 1. Running Database Migrations ---"
alembic upgrade head

if [ ! -f "/app/data/.seeded" ]; then
    echo "--- 2. Initial Setup: Generating Data ---"
    python -m app.etl.generate_data
    
    echo "--- 3. Seeding Database ---"
    python -m app.etl.seed_database
    
    echo "--- 4. Seeding Test Users ---"
    python scripts/seed_test_users.py
    
    touch /app/data/.seeded
    echo "--- Database Initialization Complete ---"
else
    echo "--- Database already seeded. Skipping data generation. ---"
fi

echo "--- 5. Starting FastAPI Server ---"

exec "$@"