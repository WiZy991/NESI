#!/bin/bash

# ============================================
# Скрипт для обновления приложения на сервере
# ============================================

# Конфигурация
APP_DIR="/home/nesi/nesi-app"
APP_NAME="nesi-app"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}🚀 Начинаю развертывание приложения NESI${NC}"
echo -e "${BLUE}============================================${NC}"

# Переход в директорию приложения
cd $APP_DIR || exit 1

# 1. Создать бэкап БД перед обновлением
echo -e "\n${YELLOW}📦 Шаг 1/7: Создание резервной копии базы данных...${NC}"
if [ -f "/home/nesi/backup-db.sh" ]; then
    /home/nesi/backup-db.sh
else
    echo -e "${YELLOW}⚠️  Скрипт бэкапа не найден, пропускаем...${NC}"
fi

# 2. Получить последние изменения из Git
echo -e "\n${YELLOW}📥 Шаг 2/7: Получение последних изменений из Git...${NC}"
if [ -d ".git" ]; then
    git fetch origin
    git pull origin main || git pull origin master
    echo -e "${GREEN}✅ Код обновлен${NC}"
else
    echo -e "${RED}❌ Git репозиторий не найден!${NC}"
    exit 1
fi

# 3. Установить зависимости
echo -e "\n${YELLOW}📦 Шаг 3/7: Установка зависимостей...${NC}"
npm ci --production=false
echo -e "${GREEN}✅ Зависимости установлены${NC}"

# 4. Применить миграции базы данных
echo -e "\n${YELLOW}🗄️  Шаг 4/7: Применение миграций базы данных...${NC}"
npx prisma generate
npx prisma migrate deploy
echo -e "${GREEN}✅ Миграции применены${NC}"

# 5. Собрать проект
echo -e "\n${YELLOW}🔨 Шаг 5/7: Сборка проекта...${NC}"
npm run build
echo -e "${GREEN}✅ Проект собран${NC}"

# 6. Перезапустить приложение
echo -e "\n${YELLOW}🔄 Шаг 6/7: Перезапуск приложения...${NC}"
pm2 reload $APP_NAME --update-env
echo -e "${GREEN}✅ Приложение перезапущено${NC}"

# 7. Проверить статус
echo -e "\n${YELLOW}🔍 Шаг 7/7: Проверка статуса...${NC}"
sleep 3
pm2 status $APP_NAME

# Проверить что приложение запущено
if pm2 list | grep -q "$APP_NAME.*online"; then
    echo -e "\n${GREEN}============================================${NC}"
    echo -e "${GREEN}✅ Развертывание успешно завершено!${NC}"
    echo -e "${GREEN}============================================${NC}"
    
    # Показать информацию о приложении
    echo -e "\n${BLUE}📊 Информация о приложении:${NC}"
    pm2 info $APP_NAME
    
    # Показать последние логи
    echo -e "\n${BLUE}📜 Последние логи:${NC}"
    pm2 logs $APP_NAME --lines 20 --nostream
    
else
    echo -e "\n${RED}============================================${NC}"
    echo -e "${RED}❌ Ошибка! Приложение не запустилось${NC}"
    echo -e "${RED}============================================${NC}"
    
    # Показать логи ошибок
    echo -e "\n${RED}📜 Логи ошибок:${NC}"
    pm2 logs $APP_NAME --err --lines 30 --nostream
    
    exit 1
fi

