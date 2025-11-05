# Настройка достижений для заказчиков

## Проблема
Достижения не отображаются у заказчиков.

## Решение

### 1. Применить миграцию
Добавить поле `targetRole` в таблицу `Badge`:

```sql
ALTER TABLE "Badge" ADD COLUMN "targetRole" TEXT;
```

Или через Prisma:
```bash
npx prisma migrate deploy
```

### 2. Создать достижения в БД
Отправить POST-запрос к `/api/admin/badges/seed` (требует админ-права).

Это создаст:
- Достижения для исполнителей (targetRole: 'executor')
- Достижения для заказчиков (targetRole: 'customer')

### 3. Проверить достижения для существующих заказчиков
Отправить POST-запрос к `/api/badges/check` от имени заказчика.

Или через консоль браузера:
```javascript
fetch('/api/badges/check', { method: 'POST', headers: { 'Authorization': 'Bearer YOUR_TOKEN' } })
```

## Логирование
Добавлено логирование в:
- `src/lib/badges/checkBadges.ts` - проверка достижений
- `src/app/profile/ProfilePageContent.tsx` - отображение достижений

Проверьте консоль браузера и сервера для диагностики.

