#!/bin/bash
# Скрипт для проверки структуры БД на сервере

echo "🔍 Проверка структуры БД..."

# Проверяем наличие поля targetRole в таблице Badge
psql $DATABASE_URL -c "\d \"Badge\"" 2>/dev/null || echo "⚠️  Таблица Badge не найдена или нет доступа"

# Проверяем количество достижений
psql $DATABASE_URL -c "SELECT COUNT(*) as total_badges FROM \"Badge\";" 2>/dev/null

# Проверяем наличие targetRole
psql $DATABASE_URL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Badge' AND column_name = 'targetRole';" 2>/dev/null

echo "✅ Проверка завершена"

