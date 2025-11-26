-- Миграция для добавления полей dealId и paymentId в таблицу Transaction
-- Выполните этот SQL в вашей базе данных

-- Добавляем поля dealId и paymentId
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "dealId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "paymentId" TEXT;

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS "Transaction_dealId_idx" ON "Transaction"("dealId");
CREATE INDEX IF NOT EXISTS "Transaction_paymentId_idx" ON "Transaction"("paymentId");

-- Проверка: должны появиться новые поля
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Transaction'
  AND column_name IN ('dealId', 'paymentId')
ORDER BY column_name;

