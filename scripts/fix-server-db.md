# Инструкция по исправлению БД на сервере

## Проблема
База данных не пустая, и Prisma не может применить миграции автоматически.

## Решение

### Вариант 1: Baseline (рекомендуется)

1. **Проверьте, какие миграции уже применены:**
```bash
# Подключитесь к БД и проверьте таблицу _prisma_migrations
psql $DATABASE_URL -c "SELECT migration_name, applied_steps_count FROM _prisma_migrations ORDER BY finished_at;"
```

2. **Создайте baseline:**
```bash
# Если миграции уже применены вручную или через другой способ
npx prisma migrate resolve --applied 20251105143727_add_targetRole_to_badge
```

3. **Или создайте baseline для всех миграций:**
```bash
# Это пометит все миграции как примененные
npx prisma migrate resolve --applied 20250818140027_add_badges
# Повторите для всех миграций
```

### Вариант 2: Проверка и ручное добавление поля targetRole

1. **Проверьте, есть ли поле targetRole:**
```bash
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'Badge' AND column_name = 'targetRole';"
```

2. **Если поля нет, добавьте вручную:**
```sql
-- Подключитесь к БД
psql $DATABASE_URL

-- Добавьте поле targetRole
ALTER TABLE "Badge" ADD COLUMN IF NOT EXISTS "targetRole" TEXT;

-- Создайте индекс
CREATE INDEX IF NOT EXISTS "Badge_targetRole_idx" ON "Badge"("targetRole");
```

3. **Пометите миграцию как примененную:**
```bash
npx prisma migrate resolve --applied 20251105143727_add_targetRole_to_badge
```

### Вариант 3: Полный baseline (если БД уже работает)

```bash
# Создайте baseline для всех существующих миграций
npx prisma migrate resolve --applied 20250818140027_add_badges
npx prisma migrate resolve --applied 20251105104659_add_target_role_to_badge
npx prisma migrate resolve --applied 20251105143727_add_targetRole_to_badge

# Затем примените оставшиеся миграции
npx prisma migrate deploy
```

## После исправления

1. **Засейте достижения:**
```bash
# Вариант 1: Через API (как админ)
curl -X POST https://your-domain.com/api/admin/badges/seed \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Вариант 2: Через скрипт
npx tsx scripts/create-customer-badges.ts
```

2. **Проверьте:**
```bash
npx tsx scripts/check-and-fix-badges-on-server.ts
```

