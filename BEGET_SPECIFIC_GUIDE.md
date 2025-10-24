# 🎯 Развертывание на VPS Beget - Специальная инструкция

Эта инструкция учитывает особенности VPS хостинга Beget.

## 📌 Особенности Beget VPS

- Предустановленная Ubuntu (обычно 20.04 или 22.04)
- Панель управления в личном кабинете beget.com
- SSH доступ по ключу или паролю
- Возможность заказать дополнительные услуги (резервное копирование, мониторинг)

---

## 🔑 Подключение к VPS Beget

### 1. Получите данные для подключения

В личном кабинете Beget:

1. Перейдите в раздел "VPS/VDS"
2. Найдите ваш сервер
3. Скопируйте:
   - IP адрес сервера
   - Имя пользователя (обычно `root`)
   - Пароль (или настройте SSH ключ)

### 2. Подключитесь через SSH

**Из Windows PowerShell:**

```powershell
ssh root@your-server-ip
```

**Или используйте PuTTY:**

- Host: `your-server-ip`
- Port: `22`
- Connection type: SSH

### 3. При первом подключении

```bash
# Смените пароль root (рекомендуется)
passwd

# Обновите систему
apt update && apt upgrade -y
```

---

## 🌐 Настройка домена на Beget

### Если домен зарегистрирован на Beget:

1. В личном кабинете перейдите в "Домены"
2. Найдите ваш домен
3. Перейдите в "DNS-записи"
4. Добавьте/измените A-запись:
   - Имя: `@` (для домена) и `www` (для поддомена)
   - Тип: `A`
   - Значение: IP адрес вашего VPS
   - TTL: 3600

**Пример:**

```
@    A    123.45.67.89
www  A    123.45.67.89
```

5. Сохраните изменения

⏰ **Внимание:** DNS изменения могут занять до 24 часов для полного распространения (обычно 10-30 минут).

### Проверка DNS:

```bash
# На вашем компьютере (Windows PowerShell)
nslookup yourdomain.com

# Должен вернуть IP адрес вашего VPS
```

---

## 🗄️ PostgreSQL на Beget VPS

На Beget VPS PostgreSQL не предустановлен, нужно установить:

```bash
# Установка PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Запуск и автозапуск
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Проверка статуса
sudo systemctl status postgresql
```

### Настройка PostgreSQL:

```bash
# Войдите в PostgreSQL
sudo -u postgres psql

# Выполните команды для создания БД
CREATE DATABASE nesi_db;
CREATE USER nesi_user WITH ENCRYPTED PASSWORD 'ваш_сильный_пароль';
GRANT ALL PRIVILEGES ON DATABASE nesi_db TO nesi_user;

# Для PostgreSQL 15+
\c nesi_db
GRANT ALL ON SCHEMA public TO nesi_user;

# Выход
\q
```

---

## 🔧 Быстрая установка (автоматизированный скрипт)

Используйте подготовленный скрипт для автоматической настройки:

```bash
# После подключения к серверу
cd ~

# Если проект на GitHub - клонируйте
git clone https://github.com/your-username/your-repo.git nesi-deploy
cd nesi-deploy

# Или загрузите файлы через SCP с вашего компьютера
# В Windows PowerShell:
# scp -r C:\Users\Perfercher\Desktop\nesi\NESI root@your-server-ip:/root/nesi-deploy

# Запустите скрипт настройки
cd /root/nesi-deploy
chmod +x deploy-scripts/*.sh
sudo bash deploy-scripts/setup-server.sh
```

---

## 📧 Настройка Email на Beget

Beget предоставляет SMTP сервер для отправки почты:

### Данные SMTP Beget:

```env
EMAIL_SERVER_HOST="smtp.beget.com"
EMAIL_SERVER_PORT="465"  # или 587 для TLS
EMAIL_SERVER_USER="ваш_email@yourdomain.com"
EMAIL_SERVER_PASSWORD="пароль_от_почты"
EMAIL_FROM="NESI <noreply@yourdomain.com>"
```

### Создание почтового ящика:

1. В личном кабинете Beget → "Почта"
2. Выберите домен
3. Создайте новый ящик (например, `noreply@yourdomain.com`)
4. Используйте эти данные в `.env` файле

---

## 🔐 SSL сертификат на Beget

Certbot работает на Beget VPS без проблем:

```bash
# Установите Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получите сертификат (после настройки Nginx и DNS)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Следуйте инструкциям Certbot
```

**Важно:** Убедитесь что:

1. DNS записи уже обновились (проверьте через `nslookup`)
2. Nginx настроен и работает
3. Порты 80 и 443 открыты в файрволе

---

## 🔥 Настройка файрвола (UFW)

Beget VPS обычно имеет открытые порты по умолчанию, но лучше настроить UFW:

```bash
# Разрешите SSH (ВАЖНО! Иначе потеряете доступ)
sudo ufw allow OpenSSH

# Разрешите HTTP и HTTPS
sudo ufw allow 'Nginx Full'

# Включите файрвол
sudo ufw enable

# Проверьте статус
sudo ufw status
```

---

## 💾 Резервное копирование на Beget

### Автоматическое резервное копирование:

Beget предлагает автоматическое резервное копирование VPS в личном кабинете (платная услуга).

### Ручное резервное копирование:

Используйте предоставленные скрипты:

```bash
# Бэкап базы данных
bash /home/nesi/backup-db.sh

# Настройте автоматический бэкап (cron)
crontab -e
# Добавьте:
0 2 * * * /home/nesi/backup-db.sh
```

### Скачивание бэкапов на локальный компьютер:

```powershell
# В Windows PowerShell
scp nesi@your-server-ip:/home/nesi/backups/*.sql.gz C:\backups\
```

---

## 🚀 Пошаговая инструкция для Beget

### Шаг 1: Подготовка (на вашем компьютере)

```powershell
cd C:\Users\Perfercher\Desktop\nesi\NESI

# Создайте .env.production
copy .env.production.example .env.production
notepad .env.production
```

В `.env.production` укажите:

```env
DATABASE_URL="postgresql://nesi_user:ВАШ_ПАРОЛЬ@localhost:5432/nesi_db?schema=public"
JWT_SECRET="ваш-супер-секретный-ключ-минимум-32-символа"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NODE_ENV="production"

# SMTP Beget
EMAIL_SERVER_HOST="smtp.beget.com"
EMAIL_SERVER_PORT="465"
EMAIL_SERVER_USER="noreply@yourdomain.com"
EMAIL_SERVER_PASSWORD="пароль_от_почты"
EMAIL_FROM="NESI <noreply@yourdomain.com>"
```

### Шаг 2: Настройка DNS (в личном кабинете Beget)

1. Домены → Ваш домен → DNS записи
2. Добавьте A-запись:
   - `@` → IP вашего VPS
   - `www` → IP вашего VPS

### Шаг 3: Подключение к VPS

```powershell
ssh root@your-vps-ip
```

### Шаг 4: Автоматическая настройка сервера

```bash
# На сервере
wget --no-check-certificate https://raw.githubusercontent.com/your-repo/main/deploy-scripts/setup-server.sh -O setup-server.sh
chmod +x setup-server.sh
sudo ./setup-server.sh
```

Или загрузите скрипт вручную и запустите:

```bash
# В PowerShell (с вашего компьютера)
scp C:\Users\Perfercher\Desktop\nesi\NESI\deploy-scripts\setup-server.sh root@your-vps-ip:/root/
```

```bash
# На сервере
chmod +x /root/setup-server.sh
sudo bash /root/setup-server.sh
```

### Шаг 5: Настройка PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE nesi_db;
CREATE USER nesi_user WITH ENCRYPTED PASSWORD 'СИЛЬНЫЙ_ПАРОЛЬ_ЗДЕСЬ';
GRANT ALL PRIVILEGES ON DATABASE nesi_db TO nesi_user;
\c nesi_db
GRANT ALL ON SCHEMA public TO nesi_user;
\q
```

### Шаг 6: Загрузка проекта

```bash
# Переключитесь на пользователя nesi
su - nesi

# Вариант A: Клонирование из Git
git clone https://github.com/your-username/nesi.git nesi-app
cd nesi-app
```

Или загрузите с вашего компьютера:

```powershell
# В PowerShell
scp -r C:\Users\Perfercher\Desktop\nesi\NESI nesi@your-vps-ip:/home/nesi/nesi-app
```

### Шаг 7: Настройка проекта

```bash
cd /home/nesi/nesi-app

# Создайте .env
nano .env
# Вставьте содержимое из .env.production
# Сохраните: Ctrl+X, Y, Enter

# Установите зависимости
npm ci --production=false

# Примените миграции
npx prisma generate
npx prisma migrate deploy

# Соберите проект
npm run build

# Запустите с PM2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### Шаг 8: Настройка Nginx

```bash
# Скопируйте конфигурацию
sudo cp deploy-scripts/nginx-config.conf /etc/nginx/sites-available/nesi

# Отредактируйте (замените yourdomain.com)
sudo nano /etc/nginx/sites-available/nesi

# Активируйте
sudo ln -s /etc/nginx/sites-available/nesi /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### Шаг 9: SSL сертификат

```bash
# Подождите 5-10 минут чтобы DNS обновились
# Проверьте: nslookup yourdomain.com

# Получите SSL
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Шаг 10: Проверка

```bash
# Проверьте статус
pm2 status

# Health check
bash deploy-scripts/health-check.sh

# Откройте в браузере
# https://yourdomain.com
```

---

## 🆘 Частые проблемы на Beget

### Проблема: "Permission denied" при SSH

**Решение:**

```bash
# Проверьте правильность IP и пароля
# Или создайте SSH ключ в личном кабинете Beget
```

### Проблема: DNS не обновляются

**Решение:**

- Подождите 10-30 минут
- Очистите DNS кеш: `ipconfig /flushdns` (Windows)
- Проверьте: `nslookup yourdomain.com`

### Проблема: Certbot ошибка "Failed authorization"

**Решение:**

```bash
# Убедитесь что:
# 1. DNS настроен правильно (nslookup yourdomain.com)
# 2. Nginx работает (sudo systemctl status nginx)
# 3. Порт 80 открыт (sudo ufw status)
# 4. Домен действительно указывает на ваш IP
```

### Проблема: Недостаточно памяти при сборке

**Решение:**

```bash
# Создайте swap файл
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Сделайте постоянным
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 📞 Поддержка Beget

- **Сайт:** beget.com
- **Тикеты:** через личный кабинет
- **Телефон:** указан на сайте
- **Email:** support@beget.com

---

## 📚 Дополнительные ресурсы

- [База знаний Beget](https://beget.com/ru/kb)
- [VPS_DEPLOYMENT_GUIDE.md](./VPS_DEPLOYMENT_GUIDE.md) - полное руководство
- [QUICK_START_DEPLOY.md](./QUICK_START_DEPLOY.md) - быстрый старт
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - чеклист

---

## ⏱️ Время развертывания на Beget

- Настройка DNS: 10-30 минут (ожидание)
- Настройка сервера: 10 минут (автоматически)
- Установка проекта: 5 минут
- Настройка Nginx и SSL: 5 минут
- **Итого: ~25-45 минут** (с учетом ожидания DNS)

---

Удачи с развертыванием на Beget! 🚀
