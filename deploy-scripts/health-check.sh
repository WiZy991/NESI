#!/bin/bash

# ============================================
# Скрипт проверки здоровья приложения
# ============================================

# Конфигурация
APP_NAME="nesi-app"
APP_URL="http://localhost:3000"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}🏥 Проверка здоровья приложения NESI${NC}"
echo -e "${BLUE}============================================${NC}"

# 1. Проверить PM2 процесс
echo -e "\n${YELLOW}1. Проверка PM2 процесса...${NC}"
if pm2 list | grep -q "$APP_NAME.*online"; then
    echo -e "${GREEN}✅ PM2 процесс запущен${NC}"
    pm2 status $APP_NAME
else
    echo -e "${RED}❌ PM2 процесс не запущен!${NC}"
    exit 1
fi

# 2. Проверить порт
echo -e "\n${YELLOW}2. Проверка порта 3000...${NC}"
if netstat -tlnp 2>/dev/null | grep -q ":3000"; then
    echo -e "${GREEN}✅ Порт 3000 слушается${NC}"
else
    echo -e "${RED}❌ Порт 3000 не слушается!${NC}"
    exit 1
fi

# 3. Проверить HTTP ответ
echo -e "\n${YELLOW}3. Проверка HTTP ответа...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $APP_URL)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✅ HTTP код: $HTTP_CODE${NC}"
else
    echo -e "${RED}❌ HTTP код: $HTTP_CODE (ожидался 200, 301 или 302)${NC}"
fi

# 4. Проверить PostgreSQL
echo -e "\n${YELLOW}4. Проверка PostgreSQL...${NC}"
if systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✅ PostgreSQL запущен${NC}"
else
    echo -e "${RED}❌ PostgreSQL не запущен!${NC}"
    exit 1
fi

# 5. Проверить Nginx
echo -e "\n${YELLOW}5. Проверка Nginx...${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx запущен${NC}"
else
    echo -e "${RED}❌ Nginx не запущен!${NC}"
    exit 1
fi

# 6. Проверить использование памяти
echo -e "\n${YELLOW}6. Использование памяти...${NC}"
free -h

# 7. Проверить использование диска
echo -e "\n${YELLOW}7. Использование диска...${NC}"
df -h | grep -E '^/dev/'

# 8. Показать последние логи
echo -e "\n${YELLOW}8. Последние логи приложения:${NC}"
pm2 logs $APP_NAME --lines 10 --nostream

echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}✅ Проверка завершена${NC}"
echo -e "${GREEN}============================================${NC}"

