# 🛠️ Скрипты развертывания NESI

Эта папка содержит автоматизированные скрипты для упрощения развертывания и обслуживания приложения NESI на VPS сервере.

## 📁 Содержимое

### 🚀 Скрипты развертывания

#### `setup-server.sh`

**Назначение:** Автоматическая настройка чистого Ubuntu сервера  
**Запуск:** `sudo bash setup-server.sh`  
**Что делает:**

- Обновляет систему
- Устанавливает Node.js 20.x
- Устанавливает PostgreSQL
- Устанавливает PM2
- Устанавливает Nginx
- Устанавливает Certbot (для SSL)
- Настраивает файрвол
- Создает пользователя для деплоя

**Время выполнения:** ~10 минут

---

#### `deploy.sh`

**Назначение:** Обновление приложения на сервере  
**Запуск:** `bash deploy.sh`  
**Что делает:**

1. Создает резервную копию БД
2. Получает последние изменения из Git
3. Устанавливает зависимости
4. Применяет миграции БД
5. Собирает проект
6. Перезапускает приложение
7. Проверяет статус

**Время выполнения:** ~3-5 минут

**Использование:**

```bash
cd /home/nesi/nesi-app
bash deploy-scripts/deploy.sh
```

---

#### `backup-db.sh`

**Назначение:** Резервное копирование базы данных  
**Запуск:** `bash backup-db.sh`  
**Что делает:**

- Создает дамп PostgreSQL базы
- Сжимает файл (gzip)
- Удаляет бэкапы старше 7 дней
- Показывает список существующих бэкапов

**Место сохранения:** `/home/nesi/backups/`

**Автоматизация (cron):**

```bash
crontab -e
# Добавить строку для ежедневного бэкапа в 2 ночи:
0 2 * * * /home/nesi/backup-db.sh
```

---

#### `health-check.sh`

**Назначение:** Проверка здоровья приложения  
**Запуск:** `bash health-check.sh`  
**Что проверяет:**

- ✅ PM2 процесс запущен
- ✅ Порт 3000 слушается
- ✅ HTTP ответ от приложения
- ✅ PostgreSQL работает
- ✅ Nginx работает
- 📊 Использование памяти
- 📊 Использование диска
- 📜 Последние логи

**Использование:**

```bash
bash deploy-scripts/health-check.sh
```

---

### ⚙️ Конфигурационные файлы

#### `nginx-config.conf`

**Назначение:** Конфигурация Nginx для NESI  
**Установка:**

```bash
sudo cp deploy-scripts/nginx-config.conf /etc/nginx/sites-available/nesi
sudo nano /etc/nginx/sites-available/nesi  # Замените yourdomain.com
sudo ln -s /etc/nginx/sites-available/nesi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Особенности:**

- ⚡ Оптимизирована для Next.js
- 📡 Специальная настройка для SSE (уведомления в реальном времени)
- 📦 Кеширование статических файлов
- 🗜️ Gzip сжатие
- 📤 Поддержка загрузки файлов до 100MB

---

## 📋 Типичный workflow

### Первое развертывание

```bash
# 1. На сервере (как root)
sudo bash deploy-scripts/setup-server.sh

# 2. Настройка PostgreSQL
sudo -u postgres psql
# CREATE DATABASE nesi_db;
# CREATE USER nesi_user WITH PASSWORD 'password';
# GRANT ALL PRIVILEGES ON DATABASE nesi_db TO nesi_user;

# 3. Переключение на пользователя nesi
su - nesi

# 4. Клонирование проекта
git clone <repo-url> nesi-app
cd nesi-app

# 5. Установка и запуск
nano .env  # Настроить переменные окружения
npm ci --production=false
npx prisma migrate deploy
npm run build
pm2 start ecosystem.config.js
pm2 startup
pm2 save

# 6. Настройка Nginx (как root)
exit  # Вернуться к root
sudo cp /home/nesi/nesi-app/deploy-scripts/nginx-config.conf /etc/nginx/sites-available/nesi
sudo nano /etc/nginx/sites-available/nesi  # Изменить домен
sudo ln -s /etc/nginx/sites-available/nesi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 7. SSL
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Обновление приложения

```bash
cd /home/nesi/nesi-app
bash deploy-scripts/deploy.sh
```

### Проверка состояния

```bash
bash deploy-scripts/health-check.sh
```

### Резервное копирование

```bash
bash deploy-scripts/backup-db.sh
```

---

## 🔧 Настройка скриптов

### Изменение конфигурации в скриптах

Все скрипты содержат секцию `Конфигурация` в начале файла. Вы можете изменить:

**backup-db.sh:**

```bash
DB_USER="nesi_user"          # Пользователь БД
DB_NAME="nesi_db"            # Имя БД
BACKUP_DIR="/home/nesi/backups"  # Директория для бэкапов
RETENTION_DAYS=7             # Сколько дней хранить бэкапы
```

**deploy.sh:**

```bash
APP_DIR="/home/nesi/nesi-app"   # Путь к приложению
APP_NAME="nesi-app"             # Имя PM2 процесса
```

**health-check.sh:**

```bash
APP_NAME="nesi-app"           # Имя PM2 процесса
APP_URL="http://localhost:3000"  # URL приложения
```

---

## 🆘 Решение проблем

### Скрипт не запускается

```bash
# Убедитесь что скрипт исполняемый
chmod +x deploy-scripts/*.sh

# Проверьте права
ls -la deploy-scripts/
```

### Ошибка "command not found"

```bash
# Убедитесь что используете bash
bash deploy-scripts/script-name.sh

# НЕ используйте sh (может быть несовместим)
```

### Permission denied

```bash
# Для скриптов требующих sudo
sudo bash deploy-scripts/setup-server.sh

# Для обычных скриптов
bash deploy-scripts/deploy.sh
```

---

## 📚 Дополнительные ресурсы

- **[VPS_DEPLOYMENT_GUIDE.md](../VPS_DEPLOYMENT_GUIDE.md)** - Полное руководство по развертыванию
- **[QUICK_START_DEPLOY.md](../QUICK_START_DEPLOY.md)** - Быстрый старт
- **[DEPLOYMENT_NOTES.md](../DEPLOYMENT_NOTES.md)** - Особенности SSE

---

## 🤝 Вклад

Если вы улучшили скрипты или нашли баг - создайте Pull Request!

---

## ⚠️ Важные замечания

1. **Всегда тестируйте скрипты** на тестовом сервере перед production
2. **Делайте бэкапы** перед запуском deploy.sh
3. **Проверяйте логи** после каждого деплоя
4. **Настройте мониторинг** для production сервера

---

Удачи с развертыванием! 🚀
