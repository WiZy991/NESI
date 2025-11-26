# 🔧 Применение миграции для полей dealId и paymentId

## Проблема

В таблице `Transaction` отсутствуют поля `dealId` и `paymentId`, хотя они есть в схеме Prisma.

## Решение

### Вариант 1: Через Prisma Migrate (рекомендуется)

```bash
cd NESI
npx prisma migrate deploy
```

Или если нужно создать новую миграцию:

```bash
cd NESI
npx prisma migrate dev --name add_tbank_deal_payment_ids
```

### Вариант 2: Вручную через SQL

Выполните следующий SQL в вашей базе данных:

```sql
-- Добавляем поля dealId и paymentId
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "dealId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "paymentId" TEXT;

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS "Transaction_dealId_idx" ON "Transaction"("dealId");
CREATE INDEX IF NOT EXISTS "Transaction_paymentId_idx" ON "Transaction"("paymentId");
```

### Вариант 3: Через Prisma Studio или другой SQL клиент

1. Подключитесь к базе данных
2. Выполните SQL из варианта 2
3. Проверьте, что поля добавлены:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Transaction'
  AND column_name IN ('dealId', 'paymentId');
```

## Проверка

После применения миграции проверьте:

```sql
-- Проверка структуры таблицы
\d "Transaction"

-- Или через SQL
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Transaction'
ORDER BY ordinal_position;
```

Должны появиться поля:

- `dealId` (TEXT, nullable)
- `paymentId` (TEXT, nullable)

## После применения

После применения миграции:

1. Перезапустите приложение
2. Попробуйте снова вывести средства
3. Система автоматически найдет или получит DealId из API

---

**Важно:** Если у вас уже есть транзакции пополнения без DealId, используйте функцию "Проверить платеж" в профиле, чтобы обновить DealId в существующих транзакциях.
