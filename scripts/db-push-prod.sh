#!/bin/bash

# ============================================
# Push Prisma schema to PRODUCTION database
# ============================================
# ⚠️  WARNING: This runs against the LIVE production database!
# Make sure you know what schema changes you're pushing.

set -e

echo ""
echo "⚠️  PRODUCTION DATABASE PUSH"
echo "=============================="
echo "This will push schema changes to your PRODUCTION Supabase database."
echo ""

# Production DIRECT connection (required — pgbouncer URLs don't support migrations)
PROD_DATABASE_URL="postgresql://postgres:Lexzermatt0812!@db.qoncxjjkgdfoyrbukvem.supabase.co:5432/postgres"

read -p "Are you sure you want to push to production? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted."
    exit 1
fi

echo ""
echo "🔄 Pushing schema to production..."
echo ""

DATABASE_URL="$PROD_DATABASE_URL" npx prisma db push

echo ""
echo "✅ Production schema push complete!"
