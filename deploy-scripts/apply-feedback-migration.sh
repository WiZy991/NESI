#!/bin/bash
# Скрипт для применения миграции модели Feedback

echo "🔄 Применяем миграцию для модели Feedback..."

# Проверяем, существует ли таблица Feedback
TABLE_EXISTS=$(psql $DATABASE_URL -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Feedback');")

if [ "$TABLE_EXISTS" = " t" ]; then
    echo "✅ Таблица Feedback уже существует"
else
    echo "📝 Создаём таблицу Feedback..."
    
    psql $DATABASE_URL <<EOF
CREATE TABLE IF NOT EXISTS "Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'general',
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "notes" TEXT
);
EOF

    echo "✅ Таблица Feedback создана"
fi

echo "🎉 Миграция применена успешно!"

