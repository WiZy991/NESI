#!/bin/bash
# Скрипт для проверки статуса миграций

echo "🔍 Проверка статуса миграций..."

# Проверяем таблицу _prisma_migrations
psql $DATABASE_URL -c "SELECT migration_name, applied_steps_count, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 10;" 2>/dev/null

echo ""
echo "📋 Список миграций в проекте:"
ls -1 prisma/migrations/ | grep -E "^[0-9]" | tail -10

