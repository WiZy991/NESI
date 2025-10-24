# ✅ Чеклист развертывания NESI на VPS

Используйте этот чеклист чтобы убедиться что ничего не забыли при развертывании.

## 📝 Перед началом

- [ ] VPS сервер арендован и доступен по SSH
- [ ] Есть доменное имя (или готовы использовать IP)
- [ ] Доменное имя настроено на IP сервера (A запись)
- [ ] Есть доступ к SMTP серверу для email (опционально)
- [ ] Сделан бэкап локальной базы данных (если есть данные)

---

## 🖥️ Настройка сервера

- [ ] Подключились к серверу по SSH
- [ ] Обновили систему: `sudo apt update && sudo apt upgrade -y`
- [ ] Установили Node.js 20.x
- [ ] Установили PostgreSQL
- [ ] Установили PM2: `sudo npm install -g pm2`
- [ ] Установили Nginx
- [ ] Установили Certbot для SSL
- [ ] Настроили файрвол (UFW)
- [ ] Создали пользователя `nesi` для деплоя
- [ ] Создали директории: `~/nesi-app`, `~/logs`, `~/backups`

### Быстрая проверка

```bash
node --version    # v20.x.x
npm --version     # 10.x.x
psql --version    # PostgreSQL 14+
pm2 --version     # 5.x.x
nginx -v          # nginx/1.x.x
```

---

## 🗄️ Настройка PostgreSQL

- [ ] Создали базу данных: `CREATE DATABASE nesi_db;`
- [ ] Создали пользователя БД: `CREATE USER nesi_user WITH PASSWORD '...';`
- [ ] Выдали права: `GRANT ALL PRIVILEGES ON DATABASE nesi_db TO nesi_user;`
- [ ] Выдали права на схему (PostgreSQL 15+): `GRANT ALL ON SCHEMA public TO nesi_user;`
- [ ] Проверили подключение: `psql -U nesi_user -d nesi_db -h localhost`
- [ ] Сохранили DATABASE_URL для .env файла

### DATABASE_URL формат

```
postgresql://nesi_user:password@localhost:5432/nesi_db?schema=public
```

---

## 📦 Загрузка проекта

- [ ] Клонировали проект или загрузили через SCP
- [ ] Проект находится в `/home/nesi/nesi-app`
- [ ] Создали `.env` файл
- [ ] Заполнили все обязательные переменные в `.env`
- [ ] Сгенерировали сильный `JWT_SECRET` (32+ символов)
- [ ] Указали правильный `DATABASE_URL`
- [ ] Указали домен в `NEXT_PUBLIC_APP_URL`

### Обязательные переменные в .env

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="длинный-случайный-ключ"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NODE_ENV="production"
```

---

## 🔨 Сборка и запуск

- [ ] Установили зависимости: `npm ci --production=false`
- [ ] Сгенерировали Prisma Client: `npx prisma generate`
- [ ] Применили миграции: `npx prisma migrate deploy`
- [ ] Заполнили начальные данные (если нужно): `npx prisma db seed`
- [ ] Собрали проект: `npm run build`
- [ ] Сборка завершилась без ошибок
- [ ] Проверили что папка `.next` создана

---

## 🚀 PM2 Configuration

- [ ] Скопировали `ecosystem.config.js` в корень проекта
- [ ] Отредактировали пути в `ecosystem.config.js` (если нужно)
- [ ] Создали директорию для логов: `mkdir -p ~/logs`
- [ ] Запустили приложение: `pm2 start ecosystem.config.js`
- [ ] Приложение в статусе "online": `pm2 status`
- [ ] Проверили логи на ошибки: `pm2 logs nesi-app`
- [ ] Настроили автозапуск: `pm2 startup` и `pm2 save`

### Проверка

```bash
pm2 status        # Должен показать "online"
pm2 logs nesi-app --lines 50  # Нет ошибок
curl http://localhost:3000    # Возвращает HTML
```

---

## 🌐 Настройка Nginx

- [ ] Скопировали конфигурацию: `sudo cp deploy-scripts/nginx-config.conf /etc/nginx/sites-available/nesi`
- [ ] Отредактировали домен в конфигурации
- [ ] Создали симлинк: `sudo ln -s /etc/nginx/sites-available/nesi /etc/nginx/sites-enabled/`
- [ ] Удалили дефолтную конфигурацию: `sudo rm /etc/nginx/sites-enabled/default`
- [ ] Проверили конфигурацию: `sudo nginx -t` (должно быть OK)
- [ ] Перезапустили Nginx: `sudo systemctl restart nginx`
- [ ] Nginx работает: `sudo systemctl status nginx`
- [ ] Сайт открывается по HTTP: `http://yourdomain.com`

### Специальная проверка для SSE

- [ ] В конфигурации есть секция `/api/notifications/stream`
- [ ] `proxy_buffering off` установлен
- [ ] `proxy_read_timeout 86400s` установлен

---

## 🔒 Настройка SSL (HTTPS)

- [ ] Запустили Certbot: `sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com`
- [ ] Ввели email для уведомлений
- [ ] Согласились с условиями
- [ ] Сертификат успешно получен
- [ ] Certbot автоматически обновил конфигурацию Nginx
- [ ] Сайт открывается по HTTPS: `https://yourdomain.com`
- [ ] Зеленый замок в браузере (сертификат валиден)
- [ ] HTTP автоматически редиректит на HTTPS
- [ ] Настроен автообновление: `sudo systemctl status certbot.timer`

### Проверка SSL

```bash
curl -I https://yourdomain.com  # Должен вернуть 200 OK
```

---

## 🧪 Тестирование приложения

- [ ] Открыли сайт в браузере: `https://yourdomain.com`
- [ ] Главная страница загружается
- [ ] Можно зарегистрироваться / войти
- [ ] Можно создать задачу
- [ ] Можно отправить сообщение
- [ ] Уведомления работают (проверить в DevTools → Network → `api/notifications/stream`)
- [ ] Загрузка файлов работает
- [ ] Все API endpoints отвечают

### Проверка SSE уведомлений

1. Откройте DevTools (F12)
2. Перейдите на вкладку Network
3. Найдите `api/notifications/stream`
4. Должен быть статус: `200 OK`
5. Type: `text/event-stream`
6. Должны приходить heartbeat каждые 30 секунд

---

## 📊 Мониторинг и логи

- [ ] Настроили мониторинг: `bash deploy-scripts/monitor.sh`
- [ ] Проверили health check: `bash deploy-scripts/health-check.sh`
- [ ] Логи PM2 доступны: `pm2 logs nesi-app`
- [ ] Логи Nginx доступны: `sudo tail -f /var/log/nginx/nesi-access.log`
- [ ] Настроили автоматический бэкап БД (cron)

### Настройка автоматического бэкапа

```bash
crontab -e
# Добавить:
0 2 * * * /home/nesi/backup-db.sh
```

---

## 🔧 Дополнительные настройки (опционально)

- [ ] Настроили мониторинг ресурсов (Grafana, etc.)
- [ ] Настроили алерты при падении сервиса
- [ ] Настроили CDN (CloudFlare, etc.)
- [ ] Настроили backup стратегию
- [ ] Документировали пароли и ключи в безопасном месте
- [ ] Настроили CI/CD для автоматического деплоя

---

## 📱 Проверка производительности

- [ ] Проверили скорость загрузки (PageSpeed Insights)
- [ ] Проверили работу на мобильных устройствах
- [ ] Провели нагрузочное тестирование (load-tests папка)
- [ ] Оптимизировали изображения
- [ ] Настроили кеширование

---

## 🆘 План восстановления

- [ ] Знаем как восстановить БД: `bash deploy-scripts/restore-db.sh`
- [ ] Знаем как откатить обновление: `git checkout previous-commit && bash deploy-scripts/deploy.sh`
- [ ] Знаем как перезапустить все сервисы
- [ ] Есть контакты поддержки хостинга (Beget)
- [ ] Документировали все кастомные настройки

### Команды для восстановления

```bash
# Восстановить БД
bash deploy-scripts/restore-db.sh

# Перезапустить все
pm2 restart nesi-app
sudo systemctl restart nginx
sudo systemctl restart postgresql

# Откатить код
git log  # Найти нужный коммит
git checkout <commit-hash>
bash deploy-scripts/deploy.sh
```

---

## 📚 Документация

- [ ] Прочитали [VPS_DEPLOYMENT_GUIDE.md](./VPS_DEPLOYMENT_GUIDE.md)
- [ ] Прочитали [DEPLOYMENT_NOTES.md](./DEPLOYMENT_NOTES.md) (про SSE)
- [ ] Понимаем как обновлять приложение: `bash deploy-scripts/deploy.sh`
- [ ] Знаем где смотреть логи
- [ ] Знаем как делать бэкапы

---

## ✅ Финальная проверка

Запустите финальный health check:

```bash
bash deploy-scripts/health-check.sh
```

Все должно быть ✅ зеленым!

---

## 🎉 Поздравляем!

Если все пункты отмечены - ваше приложение успешно развернуто!

### Полезные команды на каждый день

```bash
# Проверить статус
pm2 status

# Посмотреть логи
pm2 logs nesi-app

# Обновить приложение
cd ~/nesi-app && bash deploy-scripts/deploy.sh

# Сделать бэкап БД
bash deploy-scripts/backup-db.sh

# Проверить здоровье
bash deploy-scripts/health-check.sh

# Мониторинг в реальном времени
bash deploy-scripts/monitor.sh
```

---

## 📞 Поддержка

Если что-то не работает:

1. Проверьте логи: `pm2 logs nesi-app`
2. Проверьте статус сервисов: `bash deploy-scripts/health-check.sh`
3. Посмотрите в документацию: [VPS_DEPLOYMENT_GUIDE.md](./VPS_DEPLOYMENT_GUIDE.md)

Удачи! 🚀
