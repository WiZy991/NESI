# ⚡ Быстрый старт развертывания на VPS Ubuntu

## 🎯 Для нетерпеливых - минимальные шаги

### 1️⃣ На вашем компьютере (Windows)

```powershell
# Перейдите в папку проекта
cd C:\Users\Perfercher\Desktop\nesi\NESI

# Скопируйте пример конфигурации
copy .env.production.example .env.production

# Отредактируйте .env.production (замените YOUR_PASSWORD_HERE и другие значения)
notepad .env.production
```

### 2️⃣ На сервере - Автоматическая настройка (рекомендуется)

```bash
# Подключитесь к серверу
ssh root@your-server-ip

# Скачайте и запустите скрипт автоматической настройки
wget https://raw.githubusercontent.com/your-username/your-repo/main/deploy-scripts/setup-server.sh
chmod +x setup-server.sh
sudo ./setup-server.sh

# После завершения настройте PostgreSQL
sudo -u postgres psql
```

В PostgreSQL консоли:

```sql
CREATE DATABASE nesi_db;
CREATE USER nesi_user WITH ENCRYPTED PASSWORD 'your_strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE nesi_db TO nesi_user;
\c nesi_db
GRANT ALL ON SCHEMA public TO nesi_user;
\q
```

### 3️⃣ Загрузка проекта

```bash
# Переключитесь на пользователя nesi
su - nesi

# Клонируйте проект (если используете Git)
git clone https://github.com/your-username/your-repo.git nesi-app
cd nesi-app

# ИЛИ загрузите через SCP с вашего компьютера (в PowerShell):
# scp -r C:\Users\Perfercher\Desktop\nesi\NESI nesi@your-server-ip:/home/nesi/nesi-app
```

### 4️⃣ Настройка проекта

```bash
cd /home/nesi/nesi-app

# Создайте .env файл
nano .env
# Вставьте содержимое из .env.production и сохраните (Ctrl+X, Y, Enter)

# Установите зависимости
npm ci --production=false

# Примените миграции БД
npx prisma generate
npx prisma migrate deploy

# Соберите проект
npm run build

# Запустите с PM2
pm2 start ecosystem.config.js

# Настройте автозапуск
pm2 startup
pm2 save
```

### 5️⃣ Настройка Nginx

```bash
# Скопируйте конфигурацию
sudo cp deploy-scripts/nginx-config.conf /etc/nginx/sites-available/nesi

# Отредактируйте (замените yourdomain.com на ваш домен)
sudo nano /etc/nginx/sites-available/nesi

# Активируйте конфигурацию
sudo ln -s /etc/nginx/sites-available/nesi /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Проверьте и перезапустите
sudo nginx -t
sudo systemctl restart nginx
```

### 6️⃣ Настройка SSL

```bash
# Получите бесплатный SSL сертификат
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 7️⃣ Проверка

```bash
# Проверьте статус
pm2 status

# Запустите health check
bash deploy-scripts/health-check.sh

# Откройте браузер
# https://yourdomain.com
```

---

## 🔄 Обновление приложения

После того как все настроено, для обновления просто запустите:

```bash
cd /home/nesi/nesi-app
bash deploy-scripts/deploy.sh
```

---

## 🆘 Если что-то пошло не так

### Проблема: Приложение не запускается

```bash
pm2 logs nesi-app --lines 50
```

### Проблема: 502 Bad Gateway

```bash
pm2 status
sudo systemctl status nginx
```

### Проблема: База данных не подключается

```bash
psql -U nesi_user -d nesi_db -h localhost
```

---

## 📚 Полная документация

Для подробных инструкций смотрите:

- **[VPS_DEPLOYMENT_GUIDE.md](./VPS_DEPLOYMENT_GUIDE.md)** - полное руководство
- **[DEPLOYMENT_NOTES.md](./DEPLOYMENT_NOTES.md)** - особенности SSE

---

## ⏱️ Примерное время развертывания

- Автоматическая настройка сервера: ~10 минут
- Загрузка и настройка проекта: ~5 минут
- Настройка Nginx и SSL: ~5 минут
- **Итого: ~20 минут** ⚡

---

## 📞 Контакты

Если возникли вопросы - смотрите логи:

```bash
pm2 logs nesi-app
sudo tail -f /var/log/nginx/error.log
```

Удачи! 🚀
