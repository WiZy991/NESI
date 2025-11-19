-- Миграция: Добавление полей dealId и paymentId для Т-Банк Мультирасчеты
-- Дата: 2024-11-19
-- Описание: Добавляет поля для хранения ID сделки и ID платежа Т-Банка

-- Добавляем поля dealId и paymentId (если их еще нет)
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "dealId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "paymentId" TEXT;

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS "Transaction_dealId_idx" ON "Transaction"("dealId");
CREATE INDEX IF NOT EXISTS "Transaction_paymentId_idx" ON "Transaction"("paymentId");

-- Проверка: выводим список всех колонок таблицы Transaction
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'Transaction'
ORDER BY ordinal_position;

