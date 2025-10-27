#!/bin/bash

# 🚀 Автоматическое применение оптимизаций NESI
# Использование: bash apply-optimizations.sh

set -e  # Остановить при ошибке

echo "🚀 Начинаем применение оптимизаций..."
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Проверка что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Ошибка: package.json не найден. Запустите скрипт из корня проекта!${NC}"
    exit 1
fi

if [ ! -d "optimization-files" ]; then
    echo -e "${RED}❌ Ошибка: папка optimization-files не найдена!${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 План оптимизации:${NC}"
echo "1. Добавить индексы в БД"
echo "2. Добавить кеш категорий"
echo "3. Оптимизировать API чатов"
echo "4. Пересобрать проект"
echo "5. Перезапустить приложение"
echo ""
echo -e "${YELLOW}⚠️  Это займет примерно 5-10 минут${NC}"
echo ""
read -p "Продолжить? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Отменено"
    exit 0
fi

# ============================================
# ШАГ 1: Добавить индексы в БД
# ============================================
echo ""
echo -e "${YELLOW}📊 Шаг 1/5: Добавление индексов в БД...${NC}"

# Проверяем переменные окружения
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Файл .env не найден!${NC}"
    exit 1
fi

# Получаем параметры подключения из .env
DB_USER=$(grep "^DATABASE_URL" .env | sed -n 's/.*postgresql:\/\/\([^:]*\):.*/\1/p')
DB_NAME=$(grep "^DATABASE_URL" .env | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_HOST="localhost"

if [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
    echo -e "${YELLOW}⚠️  Не удалось автоматически определить параметры БД${NC}"
    echo "Пожалуйста, выполните вручную:"
    echo "psql -U nesi_user -d nesi_db -h localhost < optimization-files/add_indexes.sql"
else
    echo "Подключение к БД: $DB_USER@$DB_HOST/$DB_NAME"
    
    if psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" < optimization-files/add_indexes.sql; then
        echo -e "${GREEN}✅ Индексы успешно добавлены${NC}"
    else
        echo -e "${RED}❌ Ошибка при добавлении индексов${NC}"
        echo "Попробуйте выполнить вручную:"
        echo "psql -U $DB_USER -d $DB_NAME -h $DB_HOST < optimization-files/add_indexes.sql"
        read -p "Продолжить без индексов? (y/n) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

# ============================================
# ШАГ 2: Добавить кеш категорий
# ============================================
echo ""
echo -e "${YELLOW}💾 Шаг 2/5: Добавление кеша категорий...${NC}"

if [ ! -d "src/lib" ]; then
    mkdir -p src/lib
    echo "Создана директория src/lib"
fi

if [ -f "src/lib/categoryCache.ts" ]; then
    echo -e "${YELLOW}⚠️  Файл categoryCache.ts уже существует${NC}"
    cp src/lib/categoryCache.ts src/lib/categoryCache.ts.backup
    echo "Создан бэкап: categoryCache.ts.backup"
fi

cp optimization-files/categoryCache.ts src/lib/categoryCache.ts
echo -e "${GREEN}✅ Файл categoryCache.ts скопирован${NC}"

# ============================================
# ШАГ 3: Оптимизировать API чатов
# ============================================
echo ""
echo -e "${YELLOW}💬 Шаг 3/5: Оптимизация API чатов...${NC}"

if [ ! -f "src/app/api/chats/route.ts" ]; then
    echo -e "${YELLOW}⚠️  Файл src/app/api/chats/route.ts не найден, пропускаем${NC}"
else
    # Создать бэкап
    cp src/app/api/chats/route.ts src/app/api/chats/route.ts.backup
    echo "Создан бэкап: route.ts.backup"
    
    # Копировать оптимизированную версию
    cp optimization-files/optimized-chats-route.ts src/app/api/chats/route.ts
    echo -e "${GREEN}✅ API чатов оптимизирован${NC}"
fi

# ============================================
# ШАГ 4: Пересобрать проект
# ============================================
echo ""
echo -e "${YELLOW}🔨 Шаг 4/5: Пересборка проекта...${NC}"
echo "Это может занять несколько минут..."

if npm run build; then
    echo -e "${GREEN}✅ Проект успешно пересобран${NC}"
else
    echo -e "${RED}❌ Ошибка при сборке проекта${NC}"
    echo "Пожалуйста, проверьте ошибки выше"
    exit 1
fi

# ============================================
# ШАГ 5: Перезапустить приложение
# ============================================
echo ""
echo -e "${YELLOW}🔄 Шаг 5/5: Перезапуск приложения...${NC}"

if command -v pm2 &> /dev/null; then
    # Получить имя процесса PM2
    PM2_PROCESS=$(pm2 jlist | grep -o '"name":"[^"]*"' | head -1 | sed 's/"name":"\(.*\)"/\1/' || echo "nesi-app")
    
    if [ -z "$PM2_PROCESS" ]; then
        PM2_PROCESS="nesi-app"
    fi
    
    echo "Перезапуск PM2 процесса: $PM2_PROCESS"
    
    if pm2 restart "$PM2_PROCESS"; then
        echo -e "${GREEN}✅ Приложение перезапущено${NC}"
    else
        echo -e "${RED}❌ Ошибка при перезапуске PM2${NC}"
        echo "Попробуйте вручную: pm2 restart $PM2_PROCESS"
    fi
    
    echo ""
    echo "Проверка логов (Ctrl+C для выхода):"
    sleep 2
    pm2 logs "$PM2_PROCESS" --lines 30
else
    echo -e "${YELLOW}⚠️  PM2 не найден. Перезапустите приложение вручную${NC}"
fi

# ============================================
# ГОТОВО!
# ============================================
echo ""
echo ""
echo -e "${GREEN}🎉 Оптимизация завершена!${NC}"
echo ""
echo -e "${YELLOW}📊 Следующие шаги:${NC}"
echo "1. Проверьте что приложение работает: curl http://localhost:3000/api/health"
echo "2. Проверьте логи: pm2 logs"
echo "3. Запустите нагрузочные тесты: cd load-tests && npm run test:api"
echo ""
echo -e "${YELLOW}📈 Ожидаемые улучшения:${NC}"
echo "• GET /api/chats: 2-5s → 0.3s (-85%)"
echo "• GET /api/tasks: 0.8s → 0.3s (-62%)"
echo "• Запросы к БД: -60%"
echo ""
echo -e "${GREEN}🚀 Ваш проект теперь оптимизирован!${NC}"
echo ""
echo "📖 Подробности: optimization-files/APPLY_OPTIMIZATIONS.md"

