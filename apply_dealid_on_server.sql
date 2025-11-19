-- Применение миграции для добавления полей dealId и paymentId
-- Выполните этот SQL на сервере в базе данных nesi_db

-- Добавляем поля dealId и paymentId (IF NOT EXISTS для безопасности)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Transaction' AND column_name = 'dealId'
    ) THEN
        ALTER TABLE "Transaction" ADD COLUMN "dealId" TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Transaction' AND column_name = 'paymentId'
    ) THEN
        ALTER TABLE "Transaction" ADD COLUMN "paymentId" TEXT;
    END IF;
END $$;

-- Создаем индексы (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "Transaction_dealId_idx" ON "Transaction"("dealId");
CREATE INDEX IF NOT EXISTS "Transaction_paymentId_idx" ON "Transaction"("paymentId");

-- Проверка результата
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'Transaction'
  AND column_name IN ('dealId', 'paymentId')
ORDER BY column_name;

