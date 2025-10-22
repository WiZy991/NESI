# 🚀 Инструкции по деплою SSE (Server-Sent Events)

## ⚠️ ВАЖНО: SSE и Serverless платформы

Server-Sent Events (SSE) для уведомлений в реальном времени **НЕ РАБОТАЕТ** на полностью serverless платформах типа Vercel из-за:

1. Каждый запрос обрабатывается отдельным инстансом
2. Глобальные переменные не сохраняются между инстансами
3. Long-running connections ограничены (timeout ~30-60 секунд)

---

## ✅ Решения для продакшена

### Вариант 1: Vercel с ограничениями (текущее решение)

**Статус:** Частично работает  
**Ограничения:**

- SSE соединения могут разрываться
- Уведомления работают только если SSE connection и API запрос попадают на один инстанс
- Не рекомендуется для продакшена

**Что сделано:**

- Добавлен `runtime = 'nodejs'` в `/api/notifications/stream/route.ts`
- Добавлен `dynamic = 'force-dynamic'` для отключения кеширования

**Для деплоя:**

```bash
npm run build
vercel --prod
```

---

### Вариант 2: VPS/Dedicated Server (РЕКОМЕНДУЕТСЯ)

**Статус:** ✅ Полностью работает  
**Платформы:** DigitalOcean, AWS EC2, Hetzner, любой VPS

**Преимущества:**

- SSE работает стабильно
- Нет timeout ограничений
- Полный контроль над сервером

**Для деплоя на VPS:**

```bash
# 1. Соберите проект
npm run build

# 2. Запустите на сервере
npm start
# или с PM2
pm2 start npm --name "nesi" -- start

# 3. Настройте Nginx reverse proxy
# /etc/nginx/sites-available/nesi
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Важно для SSE
    location /api/notifications/stream {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
        proxy_read_timeout 86400s;
    }
}
```

---

### Вариант 3: WebSockets вместо SSE

**Статус:** ✅ Работает везде  
**Требует:** Рефакторинг кода

Заменить SSE на WebSockets или использовать библиотеку Socket.io

---

### Вариант 4: Pusher/Ably (облачный сервис)

**Статус:** ✅ Работает на любой платформе  
**Стоимость:** От $0 (free tier) до $49+/месяц

**Установка:**

```bash
npm install pusher-js
npm install pusher
```

**Преимущества:**

- Работает на Vercel
- Масштабируется автоматически
- Надежно

---

## 🔍 Как проверить, где проблема

### 1. Проверьте логи на продакшене

```bash
vercel logs
```

### 2. Проверьте в браузере (DevTools → Network)

- Найдите запрос к `/api/notifications/stream`
- Проверьте статус: должен быть `200` и `EventStream`
- Если статус `502` или `504` - проблема с платформой

### 3. Проверьте в консоли браузера

- Должно быть: `🔔 SSE подключение установлено`
- Зеленая точка возле колокольчика
- Heartbeat каждые 30 секунд

---

## 📝 Текущая конфигурация

### Файлы с SSE:

- `/api/notifications/stream/route.ts` - SSE endpoint
- `/components/Header.tsx` - клиент SSE

### API endpoints, отправляющие уведомления:

- `/api/messages/send/route.ts` - личные сообщения
- `/api/tasks/[id]/messages/route.ts` - сообщения в задачах
- `/api/tasks/[id]/responses/route.ts` - отклики на задачи
- `/api/hire/route.ts` - запросы найма
- `/api/tasks/[id]/review/route.ts` - отзывы
- `/api/tasks/[id]/complete/route.ts` - завершение задач

---

## 🛠️ Временное решение (fallback)

Если SSE не работает, система продолжит работать с fallback механизмом:

1. Уведомления сохраняются в базу данных
2. Клиент запрашивает уведомления каждые 30 секунд
3. Toast уведомления не появляются, но счетчик обновляется

---

## 📞 Рекомендации

Для **продакшена** рекомендую:

1. **Краткосрочно:** Использовать VPS (DigitalOcean от $6/месяц)
2. **Долгосрочно:** Мигрировать на WebSockets или Pusher для лучшей масштабируемости

---

## 🔄 После деплоя

После деплоя новой версии:

1. Очистите кеш браузера (Ctrl+Shift+R)
2. Проверьте версию в DevTools → Network → Headers
3. Убедитесь что новый билд задеплоен: `vercel ls`
