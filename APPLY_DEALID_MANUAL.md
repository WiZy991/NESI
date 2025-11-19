# 🔧 Применение миграции для dealId и paymentId (вручную)

## Проблема

Prisma Migrate не может применить миграции из-за конфликтов. Применим миграцию вручную.

## Решение

### Шаг 1: Подключитесь к базе данных

Используйте любой SQL клиент (pgAdmin, DBeaver, psql, или через Railway/другой хостинг).

### Шаг 2: Выполните SQL

```sql
-- Добавляем поля dealId и paymentId
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "dealId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "paymentId" TEXT;

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS "Transaction_dealId_idx" ON "Transaction"("dealId");
CREATE INDEX IF NOT EXISTS "Transaction_paymentId_idx" ON "Transaction"("paymentId");
```

### Шаг 3: Проверьте результат

```sql
-- Проверка: должны появиться новые поля
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Transaction'
  AND column_name IN ('dealId', 'paymentId')
ORDER BY column_name;
```

Должны увидеть:

- `dealId` (TEXT, nullable)
- `paymentId` (TEXT, nullable)

### Шаг 4: Пометить миграцию как примененную (опционально)

Если хотите, чтобы Prisma знал, что миграция применена:

```sql
-- Вставьте запись в таблицу _prisma_migrations
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
  gen_random_uuid()::text,
  'checksum_here', -- можно оставить пустым или найти в файле миграции
  NOW(),
  'add_tbank_deal_payment_ids',
  NULL,
  NULL,
  NOW(),
  1
);
```

Или просто используйте `prisma db push` для синхронизации схемы без миграций.

## Альтернатива: prisma db push

Если не хотите возиться с миграциями, можно использовать:

```bash
npx prisma db push
```

Это синхронизирует схему Prisma с базой данных без создания миграций.

---

**После применения:** Перезапустите приложение и попробуйте снова вывести средства.
