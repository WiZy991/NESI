#!/bin/bash

# ============================================
# Установка и настройка Redis для кеширования
# ============================================

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}🚀 Установка Redis для NESI${NC}"
echo -e "${BLUE}============================================${NC}"

# 1. Установка Redis
echo -e "\n${YELLOW}📦 Шаг 1/6: Установка Redis...${NC}"
sudo apt update
sudo apt install redis-server -y

# 2. Настройка Redis
echo -e "\n${YELLOW}⚙️  Шаг 2/6: Настройка Redis...${NC}"

# Настроить Redis для использования systemd
sudo sed -i 's/supervised no/supervised systemd/' /etc/redis/redis.conf

# Установить максимальную память (256MB)
sudo sed -i 's/# maxmemory <bytes>/maxmemory 256mb/' /etc/redis/redis.conf

# Политика вытеснения (LRU)
sudo sed -i 's/# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf

# 3. Перезапуск Redis
echo -e "\n${YELLOW}🔄 Шаг 3/6: Перезапуск Redis...${NC}"
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# 4. Проверка статуса
echo -e "\n${YELLOW}🔍 Шаг 4/6: Проверка Redis...${NC}"
sudo systemctl status redis-server --no-pager

# Проверка подключения
if redis-cli ping | grep -q PONG; then
    echo -e "${GREEN}✅ Redis работает корректно!${NC}"
else
    echo -e "${RED}❌ Redis не отвечает!${NC}"
    exit 1
fi

# 5. Установка ioredis в проект
echo -e "\n${YELLOW}📦 Шаг 5/6: Установка ioredis...${NC}"
cd /home/nesi/nesi-app
npm install ioredis
npm install -D @types/ioredis

# 6. Добавление в .env
echo -e "\n${YELLOW}📝 Шаг 6/6: Обновление .env...${NC}"

if ! grep -q "REDIS_URL" .env; then
    echo "" >> .env
    echo "# Redis для кеширования" >> .env
    echo "REDIS_URL=redis://localhost:6379" >> .env
    echo -e "${GREEN}✅ REDIS_URL добавлен в .env${NC}"
else
    echo -e "${YELLOW}⚠️  REDIS_URL уже существует в .env${NC}"
fi

# Информация
echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}✅ Redis успешно установлен и настроен!${NC}"
echo -e "${GREEN}============================================${NC}"

echo -e "\n${BLUE}📊 Информация:${NC}"
echo -e "  - Redis работает на порту: 6379"
echo -e "  - Максимальная память: 256MB"
echo -e "  - Политика вытеснения: allkeys-lru"
echo -e ""
echo -e "${YELLOW}📝 Полезные команды:${NC}"
echo -e "  - Проверка статуса: ${BLUE}sudo systemctl status redis-server${NC}"
echo -e "  - Подключение к Redis: ${BLUE}redis-cli${NC}"
echo -e "  - Мониторинг Redis: ${BLUE}redis-cli monitor${NC}"
echo -e "  - Статистика Redis: ${BLUE}redis-cli info stats${NC}"
echo -e "  - Очистка кеша: ${BLUE}redis-cli FLUSHALL${NC}"
echo -e ""
echo -e "${GREEN}🎉 Готово! Теперь скопируйте файл redis.ts в src/lib/${NC}"

