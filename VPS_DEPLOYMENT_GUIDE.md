# 🚀 Руководство по развертыванию на VPS Ubuntu (Beget)

## 📋 Содержание

1. [Подготовка VPS сервера](#1-подготовка-vps-сервера)
2. [Установка необходимого ПО](#2-установка-необходимого-по)
3. [Настройка PostgreSQL](#3-настройка-postgresql)
4. [Подготовка и загрузка проекта](#4-подготовка-и-загрузка-проекта)
5. [Миграция базы данных](#5-миграция-базы-данных)
6. [Запуск приложения с PM2](#6-запуск-приложения-с-pm2)
7. [Настройка Nginx](#7-настройка-nginx)
8. [Настройка SSL (Let's Encrypt)](#8-настройка-ssl-lets-encrypt)
9. [Настройка автозапуска](#9-настройка-автозапуска)
10. [Мониторинг и обслуживание](#10-мониторинг-и-обслуживание)

---

## 1. Подготовка VPS сервера

### 1.1. Подключение к серверу

```bash
# Подключитесь к серверу по SSH
ssh root@your-server-ip

# Обновите систему
sudo apt update && sudo apt upgrade -y
```

### 1.2. Создание пользователя для деплоя

```bash
# Создайте нового пользователя (рекомендуется для безопасности)
adduser nesi

# Добавьте его в группу sudo
usermod -aG sudo nesi

# Переключитесь на нового пользователя
su - nesi
```

---

## 2. Установка необходимого ПО

### 2.1. Установка Node.js (LTS версия)

```bash
# Установите Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверьте установку
node --version  # должно быть v20.x.x
npm --version
```

### 2.2. Установка PostgreSQL

```bash
# Установите PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Проверьте статус
sudo systemctl status postgresql
```

### 2.3. Установка PM2 (менеджер процессов)

```bash
sudo npm install -g pm2
```

### 2.4. Установка Nginx

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2.5. Установка Git

```bash
sudo apt install git -y
```

---

## 3. Настройка PostgreSQL

### 3.1. Создание базы данных и пользователя

```bash
# Переключитесь на пользователя postgres
sudo -u postgres psql

# В PostgreSQL консоли выполните:
CREATE DATABASE nesi_db;
CREATE USER nesi_user WITH ENCRYPTED PASSWORD 'your_strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE nesi_db TO nesi_user;

# Для PostgreSQL 15+ дополнительно:
\c nesi_db
GRANT ALL ON SCHEMA public TO nesi_user;

# Выход из PostgreSQL
\q
```

### 3.2. Настройка подключения (опционально)

```bash
# Отредактируйте pg_hba.conf если нужно
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Добавьте строку (если подключение локальное через localhost, это обычно не требуется):
# local   all   nesi_user   md5

# Перезапустите PostgreSQL
sudo systemctl restart postgresql
```

### 3.3. Сохраните строку подключения

```
DATABASE_URL="postgresql://nesi_user:your_strong_password_here@localhost:5432/nesi_db?schema=public"
```

---

## 4. Подготовка и загрузка проекта

### 4.1. На вашем локальном компьютере

#### Создайте .env.production файл

```bash
# В папке проекта создайте файл .env.production
# C:\Users\Perfercher\Desktop\nesi\NESI\.env.production
```

Содержимое `.env.production`:

```env
# Database
DATABASE_URL="postgresql://nesi_user:your_strong_password_here@localhost:5432/nesi_db?schema=public"

# JWT Secret (сгенерируйте сильный ключ)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# App URL (ваш домен)
NEXT_PUBLIC_APP_URL="https://yourdomain.com"

# Email (если используете)
EMAIL_SERVER_HOST="smtp.yourdomain.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="noreply@yourdomain.com"
EMAIL_SERVER_PASSWORD="your-email-password"
EMAIL_FROM="noreply@yourdomain.com"

# Node Environment
NODE_ENV="production"
```

#### Подготовьте проект к загрузке

```bash
# Перейдите в папку проекта
cd C:\Users\Perfercher\Desktop\nesi\NESI

# Убедитесь что .env.production в .gitignore
# (он уже должен быть там если используете .env)

# Создайте архив проекта (исключая node_modules)
# Используйте PowerShell:
Compress-Archive -Path * -DestinationPath nesi-project.zip -Force -CompressionLevel Optimal
```

### 4.2. Загрузка на сервер

#### Вариант A: Через SCP (с Windows PowerShell)

```powershell
# Загрузите архив на сервер
scp nesi-project.zip nesi@your-server-ip:/home/nesi/
```

#### Вариант B: Через Git (рекомендуется)

Если ваш проект в Git репозитории:

```bash
# На сервере
cd /home/nesi
git clone https://github.com/your-username/your-repo.git nesi-app
cd nesi-app
```

### 4.3. Настройка на сервере

```bash
# Если загружали архив
cd /home/nesi
unzip nesi-project.zip -d nesi-app
cd nesi-app

# Установите зависимости
npm ci --production=false

# Создайте .env файл
nano .env
```

Вставьте содержимое `.env.production` и сохраните (Ctrl+X, Y, Enter).

---

## 5. Миграция базы данных

### 5.1. Примените миграции Prisma

```bash
cd /home/nesi/nesi-app

# Сгенерируйте Prisma Client
npx prisma generate

# Примените миграции
npx prisma migrate deploy

# Проверьте подключение
npx prisma db push
```

### 5.2. Заполните начальные данные (seed)

```bash
# Если у вас есть seed данные
npx prisma db seed
```

### 5.3. Миграция данных из локальной БД (опционально)

Если нужно перенести существующие данные:

```bash
# На локальном компьютере (Windows PowerShell)
# Установите PostgreSQL клиент если еще нет

# Экспортируйте данные (если у вас уже есть production данные)
# Это зависит от вашей текущей БД

# Для PostgreSQL:
pg_dump -U postgres -d nesi_db > nesi_backup.sql

# Загрузите на сервер
scp nesi_backup.sql nesi@your-server-ip:/home/nesi/

# На сервере импортируйте
psql -U nesi_user -d nesi_db < /home/nesi/nesi_backup.sql
```

---

## 6. Запуск приложения с PM2

### 6.1. Соберите проект

```bash
cd /home/nesi/nesi-app

# Соберите production версию
npm run build
```

### 6.2. Создайте PM2 конфигурацию

```bash
# Создайте файл ecosystem.config.js
nano ecosystem.config.js
```

Содержимое `ecosystem.config.js`:

```javascript
module.exports = {
	apps: [
		{
			name: 'nesi-app',
			script: 'npm',
			args: 'start',
			cwd: '/home/nesi/nesi-app',
			instances: 'max', // Использует все CPU ядра
			exec_mode: 'cluster',
			env: {
				NODE_ENV: 'production',
				PORT: 3000,
			},
			error_file: '/home/nesi/logs/nesi-error.log',
			out_file: '/home/nesi/logs/nesi-out.log',
			log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
			merge_logs: true,
			autorestart: true,
			watch: false,
			max_memory_restart: '1G',
			exp_backoff_restart_delay: 100,
		},
	],
}
```

### 6.3. Создайте директорию для логов

```bash
mkdir -p /home/nesi/logs
```

### 6.4. Запустите приложение

```bash
# Запустите с PM2
pm2 start ecosystem.config.js

# Проверьте статус
pm2 status

# Посмотрите логи
pm2 logs nesi-app

# Если нужно перезапустить
pm2 restart nesi-app

# Если нужно остановить
pm2 stop nesi-app
```

---

## 7. Настройка Nginx

### 7.1. Создайте конфигурацию Nginx

```bash
sudo nano /etc/nginx/sites-available/nesi
```

Содержимое конфигурации:

```nginx
# Перенаправление HTTP на HTTPS (добавим после настройки SSL)
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Временно пустой, обновим после SSL
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # ВАЖНО: Специальная настройка для SSE (Server-Sent Events)
    location /api/notifications/stream {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Критически важно для SSE
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
        proxy_read_timeout 86400s;
        proxy_connect_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Увеличьте размер загружаемых файлов если нужно
    client_max_body_size 100M;
}
```

### 7.2. Активируйте конфигурацию

```bash
# Создайте символическую ссылку
sudo ln -s /etc/nginx/sites-available/nesi /etc/nginx/sites-enabled/

# Удалите дефолтную конфигурацию
sudo rm /etc/nginx/sites-enabled/default

# Проверьте конфигурацию
sudo nginx -t

# Перезапустите Nginx
sudo systemctl restart nginx
```

### 7.3. Настройте файрвол

```bash
# Разрешите HTTP и HTTPS
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable

# Проверьте статус
sudo ufw status
```

---

## 8. Настройка SSL (Let's Encrypt)

### 8.1. Установите Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 8.2. Получите SSL сертификат

```bash
# Замените yourdomain.com на ваш домен
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Следуйте инструкциям:
# - Введите email
# - Согласитесь с условиями
# - Certbot автоматически настроит HTTPS
```

### 8.3. Настройте автообновление сертификата

```bash
# Проверьте что таймер активен
sudo systemctl status certbot.timer

# Тест обновления
sudo certbot renew --dry-run
```

---

## 9. Настройка автозапуска

### 9.1. Настройте PM2 для автозапуска

```bash
# Сгенерируйте startup скрипт
pm2 startup

# Выполните команду которую выдаст PM2 (примерно такая):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u nesi --hp /home/nesi

# Сохраните текущий список процессов
pm2 save
```

### 9.2. Проверка автозапуска

```bash
# Перезагрузите сервер
sudo reboot

# После перезагрузки проверьте
pm2 status
```

---

## 10. Мониторинг и обслуживание

### 10.1. Просмотр логов

```bash
# PM2 логи
pm2 logs nesi-app

# Nginx логи
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL логи
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### 10.2. Мониторинг с PM2

```bash
# Мониторинг в реальном времени
pm2 monit

# Информация о процессе
pm2 info nesi-app
```

### 10.3. Обновление приложения

```bash
cd /home/nesi/nesi-app

# Если используете Git
git pull origin main

# Установите новые зависимости если есть
npm ci --production=false

# Примените миграции БД если есть
npx prisma migrate deploy

# Пересоберите проект
npm run build

# Перезапустите приложение
pm2 restart nesi-app

# Или перезагрузите без даунтайма
pm2 reload nesi-app
```

### 10.4. Резервное копирование БД

```bash
# Создайте скрипт для бэкапа
nano /home/nesi/backup-db.sh
```

Содержимое `backup-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/home/nesi/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/nesi_db_$DATE.sql"

mkdir -p $BACKUP_DIR

pg_dump -U nesi_user nesi_db > $BACKUP_FILE

# Удалить бэкапы старше 7 дней
find $BACKUP_DIR -name "nesi_db_*.sql" -mtime +7 -delete

echo "Backup created: $BACKUP_FILE"
```

```bash
# Сделайте скрипт исполняемым
chmod +x /home/nesi/backup-db.sh

# Настройте cron для автоматического бэкапа
crontab -e

# Добавьте строку (бэкап каждый день в 2 ночи):
0 2 * * * /home/nesi/backup-db.sh
```

---

## ✅ Проверка развертывания

После завершения всех шагов проверьте:

1. **Приложение работает**: откройте `https://yourdomain.com`
2. **SSE уведомления**: проверьте в DevTools → Network → `api/notifications/stream`
3. **SSL сертификат**: должен быть валидным (зеленый замок)
4. **База данных**: войдите в систему и проверьте функционал
5. **Автозапуск**: перезагрузите сервер и проверьте что все запустилось

---

## 🔧 Решение проблем

### Проблема: Приложение не запускается

```bash
# Проверьте логи PM2
pm2 logs nesi-app --lines 100

# Проверьте .env файл
cat /home/nesi/nesi-app/.env

# Проверьте подключение к БД
cd /home/nesi/nesi-app
npx prisma db pull
```

### Проблема: 502 Bad Gateway

```bash
# Проверьте что приложение запущено
pm2 status

# Проверьте что порт 3000 слушается
sudo netstat -tlnp | grep 3000

# Проверьте логи Nginx
sudo tail -f /var/log/nginx/error.log
```

### Проблема: База данных не подключается

```bash
# Проверьте что PostgreSQL запущен
sudo systemctl status postgresql

# Проверьте подключение
psql -U nesi_user -d nesi_db -h localhost

# Проверьте DATABASE_URL в .env
```

### Проблема: SSE не работает

```bash
# Проверьте конфигурацию Nginx для /api/notifications/stream
sudo nginx -t
sudo systemctl restart nginx

# Убедитесь что proxy_buffering off установлен
sudo cat /etc/nginx/sites-available/nesi | grep -A 10 "notifications/stream"
```

---

## 📚 Полезные команды

```bash
# PM2
pm2 list                    # Список процессов
pm2 restart nesi-app        # Перезапуск
pm2 stop nesi-app           # Остановка
pm2 delete nesi-app         # Удаление
pm2 logs nesi-app           # Логи в реальном времени
pm2 monit                   # Мониторинг

# Nginx
sudo systemctl status nginx  # Статус
sudo systemctl restart nginx # Перезапуск
sudo nginx -t               # Проверка конфигурации

# PostgreSQL
sudo systemctl status postgresql  # Статус
psql -U nesi_user -d nesi_db     # Подключение к БД

# Система
df -h                       # Место на диске
free -h                     # Память
top                         # Процессы
htop                        # Улучшенный top (установите: sudo apt install htop)
```

---

## 🎯 Следующие шаги (опционально)

1. **CDN**: Настройте CloudFlare для ускорения загрузки
2. **Мониторинг**: Установите Grafana + Prometheus
3. **Alerts**: Настройте уведомления при проблемах
4. **CI/CD**: Автоматизируйте деплой через GitHub Actions

---

## 📞 Поддержка

Если возникнут проблемы:

- Проверьте логи: `pm2 logs nesi-app`
- Проверьте статус: `pm2 status`
- Проверьте Nginx: `sudo nginx -t`
- Проверьте БД: `psql -U nesi_user -d nesi_db`

Удачи с развертыванием! 🚀
