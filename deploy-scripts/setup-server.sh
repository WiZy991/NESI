#!/bin/bash

# ============================================
# Автоматическая настройка VPS сервера для NESI
# Запустите этот скрипт на чистом Ubuntu сервере
# ============================================

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Пожалуйста, запустите скрипт с правами root (sudo)"
    exit 1
fi

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}🚀 Автоматическая настройка сервера для NESI${NC}"
echo -e "${BLUE}============================================${NC}"

# 1. Обновление системы
echo -e "\n${YELLOW}📦 Шаг 1/10: Обновление системы...${NC}"
apt update && apt upgrade -y
echo -e "${GREEN}✅ Система обновлена${NC}"

# 2. Установка базовых пакетов
echo -e "\n${YELLOW}📦 Шаг 2/10: Установка базовых пакетов...${NC}"
apt install -y curl wget git unzip build-essential
echo -e "${GREEN}✅ Базовые пакеты установлены${NC}"

# 3. Установка Node.js
echo -e "\n${YELLOW}📦 Шаг 3/10: Установка Node.js 20.x...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
echo -e "${GREEN}✅ Node.js установлен: $(node --version)${NC}"

# 4. Установка PostgreSQL
echo -e "\n${YELLOW}🗄️  Шаг 4/10: Установка PostgreSQL...${NC}"
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
echo -e "${GREEN}✅ PostgreSQL установлен${NC}"

# 5. Установка PM2
echo -e "\n${YELLOW}📦 Шаг 5/10: Установка PM2...${NC}"
npm install -g pm2
echo -e "${GREEN}✅ PM2 установлен${NC}"

# 6. Установка Nginx
echo -e "\n${YELLOW}🌐 Шаг 6/10: Установка Nginx...${NC}"
apt install -y nginx
systemctl enable nginx
systemctl start nginx
echo -e "${GREEN}✅ Nginx установлен${NC}"

# 7. Установка Certbot для SSL
echo -e "\n${YELLOW}🔒 Шаг 7/10: Установка Certbot...${NC}"
apt install -y certbot python3-certbot-nginx
echo -e "${GREEN}✅ Certbot установлен${NC}"

# 8. Настройка файрвола
echo -e "\n${YELLOW}🛡️  Шаг 8/10: Настройка файрвола...${NC}"
ufw allow OpenSSH
ufw allow 'Nginx Full'
echo "y" | ufw enable
echo -e "${GREEN}✅ Файрвол настроен${NC}"

# 9. Создание пользователя для деплоя
echo -e "\n${YELLOW}👤 Шаг 9/10: Создание пользователя 'nesi'...${NC}"
if id "nesi" &>/dev/null; then
    echo -e "${YELLOW}⚠️  Пользователь 'nesi' уже существует${NC}"
else
    adduser --disabled-password --gecos "" nesi
    usermod -aG sudo nesi
    echo -e "${GREEN}✅ Пользователь 'nesi' создан${NC}"
fi

# 10. Создание директорий
echo -e "\n${YELLOW}📁 Шаг 10/10: Создание директорий...${NC}"
su - nesi -c "mkdir -p ~/nesi-app ~/logs ~/backups"
echo -e "${GREEN}✅ Директории созданы${NC}"

# Финальная информация
echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}✅ Сервер успешно настроен!${NC}"
echo -e "${GREEN}============================================${NC}"

echo -e "\n${BLUE}📋 Установленные компоненты:${NC}"
echo -e "  - Node.js: $(node --version)"
echo -e "  - npm: $(npm --version)"
echo -e "  - PostgreSQL: $(psql --version | head -n1)"
echo -e "  - PM2: $(pm2 --version)"
echo -e "  - Nginx: $(nginx -v 2>&1)"

echo -e "\n${YELLOW}📝 Следующие шаги:${NC}"
echo -e "  1. Настройте PostgreSQL:"
echo -e "     ${BLUE}sudo -u postgres psql${NC}"
echo -e "     ${BLUE}CREATE DATABASE nesi_db;${NC}"
echo -e "     ${BLUE}CREATE USER nesi_user WITH ENCRYPTED PASSWORD 'your_password';${NC}"
echo -e "     ${BLUE}GRANT ALL PRIVILEGES ON DATABASE nesi_db TO nesi_user;${NC}"
echo -e ""
echo -e "  2. Переключитесь на пользователя nesi:"
echo -e "     ${BLUE}su - nesi${NC}"
echo -e ""
echo -e "  3. Клонируйте проект:"
echo -e "     ${BLUE}cd ~ && git clone <your-repo-url> nesi-app${NC}"
echo -e ""
echo -e "  4. Следуйте инструкциям в VPS_DEPLOYMENT_GUIDE.md"
echo -e ""
echo -e "${GREEN}🎉 Готово!${NC}"

