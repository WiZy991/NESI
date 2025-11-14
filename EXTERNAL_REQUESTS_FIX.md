# Исправление проблемы с внешними запросами

## Проблема

Beget блокировал порты на исходящие запросы, утверждая, что с IP-адреса сервера идут DDoS-атаки на немецкие и испанские сайты.

## Найденные проблемы

### 1. Google Fonts через @import в CSS

**Проблема**: В `globals.css` был `@import url('https://fonts.googleapis.com/...')`, который:

- Делает запросы с сервера при SSR
- Может редиректить на разные CDN серверы (включая европейские)
- Создает внешние HTTP запросы с IP сервера

**Решение**:

- ✅ Убран `@import` из CSS
- ✅ Шрифты загружаются через Next.js font optimization в `layout.tsx`
- ✅ Next.js оптимизирует шрифты и загружает их локально

### 2. Интервал polling

**Было**: 5 секунд (слишком часто)  
**Стало**: 10 секунд (баланс между отзывчивостью и нагрузкой)

### 3. Rate limiting

**Обновлено**: С 3 до 8 запросов в минуту (для интервала 10 секунд)

## Внесенные изменения

### 1. `src/app/globals.css`

```css
/* БЫЛО: */
@import url('https://fonts.googleapis.com/css2?family=Inter...');

/* СТАЛО: */
/* Google Fonts загружаются через Next.js font optimization в layout.tsx */
```

### 2. `src/app/layout.tsx`

Добавлены все необходимые шрифты через Next.js:

```typescript
import { Inter, Poppins, JetBrains_Mono } from 'next/font/google'

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' })
const poppins = Poppins({ ... })
const jetbrainsMono = JetBrains_Mono({ ... })
```

### 3. `src/components/NotificationPolling.tsx`

- Интервал изменен с 30 на 10 секунд
- Сохранены все защиты (rate limiting, проверка активности вкладки, экспоненциальная задержка)

### 4. `src/app/api/notifications/poll/route.ts`

- Rate limiting обновлен: 8 запросов в минуту (вместо 3)

## Почему это решает проблему

1. **Нет внешних запросов**: Next.js font optimization загружает шрифты локально при билде
2. **Меньше нагрузка**: Интервал polling 10 секунд вместо 5
3. **Защита от злоупотреблений**: Rate limiting предотвращает слишком частые запросы

## Проверка после деплоя

1. Проверьте, что нет запросов к `fonts.googleapis.com`:

   ```bash
   # На сервере
   netstat -an | grep ESTABLISHED | grep -v 127.0.0.1
   # Или в логах Nginx
   grep "fonts.googleapis" /var/log/nginx/access.log
   ```

2. Проверьте, что шрифты загружаются локально:

   - Откройте DevTools → Network
   - Проверьте, что шрифты загружаются с вашего домена, а не с Google

3. Мониторинг запросов:
   ```bash
   # Количество запросов к polling API
   grep "/api/notifications/poll" /var/log/nginx/access.log | wc -l
   ```

## Дополнительные рекомендации

Если проблема повторится:

1. **Проверьте другие внешние запросы**:

   - Проверьте все `fetch()` вызовы в коде
   - Проверьте зависимости в `package.json` на наличие внешних запросов
   - Проверьте cron jobs и фоновые задачи

2. **Мониторинг исходящих соединений**:

   ```bash
   # На сервере
   netstat -tuln | grep ESTABLISHED
   ss -tuln | grep ESTABLISHED
   ```

3. **Проверьте логи сервера**:

   ```bash
   # Логи Nginx
   tail -f /var/log/nginx/access.log | grep -v "127.0.0.1"

   # Логи приложения
   pm2 logs nesi-app
   ```

4. **Свяжитесь с Beget**:
   - Предоставьте логи, показывающие только внутренние запросы
   - Объясните, что внешние запросы убраны
   - Попросите предоставить конкретные IP-адреса, на которые идут запросы
