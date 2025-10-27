#!/bin/bash
# ==================================================
# Скрипт диагностики ошибки 502 Bad Gateway
# ==================================================

echo "🔍 Диагностика 502 Bad Gateway..."
echo ""

# 1. Проверка запущен ли процесс на порту 3000
echo "1️⃣ Проверка порта 3000..."
if lsof -i :3000 > /dev/null 2>&1; then
    echo "✅ Порт 3000 занят"
    lsof -i :3000
else
    echo "❌ Порт 3000 НЕ ЗАНЯТ!"
    echo "   Приложение не запущено на порту 3000"
fi
echo ""

# 2. Проверка PM2 статус
echo "2️⃣ Статус PM2..."
pm2 list
echo ""

# 3. Проверка логов приложения
echo "3️⃣ Последние 50 строк логов приложения..."
pm2 logs nesi-app --lines 50 --nostream
echo ""

# 4. Проверка подключения к базе данных
echo "4️⃣ Проверка подключения к PostgreSQL..."
if command -v psql &> /dev/null; then
    if PGPASSWORD="$DATABASE_PASSWORD" psql -h localhost -U nesi -d nesi_db -c "SELECT 1;" > /dev/null 2>&1; then
        echo "✅ Подключение к БД работает"
    else
        echo "❌ НЕ МОЖЕТ ПОДКЛЮЧИТЬСЯ К БД!"
        echo "   Проверьте переменные окружения: DATABASE_URL"
    fi
else
    echo "⚠️ psql не найден, пропускаем проверку БД"
fi
echo ""

# 5. Проверка переменных окружения
echo "5️⃣ Проверка .env файла..."
if [ -f "/home/nesi/nesi-app/.env" ]; then
    echo "✅ Файл .env существует"
    echo "   Проверьте наличие JWT_SECRET и DATABASE_URL"
    grep -E "JWT_SECRET|DATABASE_URL|NODE_ENV" /home/nesi/nesi-app/.env | sed 's/=.*/=***/'
else
    echo "❌ Файл .env НЕ НАЙДЕН!"
    echo "   Создайте .env файл с необходимыми переменными"
fi
echo ""

# 6. Проверка nginx
echo "6️⃣ Статус Nginx..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx запущен"
else
    echo "❌ Nginx НЕ ЗАПУЩЕН!"
fi
echo ""

# 7. Проверка последних ошибок nginx
echo "7️⃣ Последние ошибки Nginx..."
sudo tail -20 /var/log/nginx/error.log
echo ""

# 8. Попытка перезапустить приложение
echo ""
echo "=========================================="
echo "🎯 ЧТО ДЕЛАТЬ:"
echo "=========================================="
echo ""
echo "Если приложение не запущено:"
echo "  pm2 start ecosystem.config.js"
echo ""
echo "Если приложение падает:"
echo "  pm2 logs nesi-app --lines 100"
echo ""
echo "Перезапуск приложения:"
echo "  pm2 restart nesi-app"
echo ""
echo "Перезапуск nginx:"
echo "  sudo systemctl restart nginx"
echo ""
echo "Проверка конфигурации nginx:"
echo "  sudo nginx -t"
echo ""

