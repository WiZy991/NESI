#!/bin/bash
# Скрипт для применения миграции HireRequest

echo "🔄 Применяем миграцию для HireRequest..."

# Применяем SQL миграцию
psql $DATABASE_URL -f deploy-scripts/add-hire-message-and-amount.sql

echo "🎉 Миграция применена успешно!"

