-- Миграция для добавления полей message и amount в таблицу HireRequest

-- Проверяем существование колонки message
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'HireRequest' AND column_name = 'message'
    ) THEN
        ALTER TABLE "HireRequest" ADD COLUMN "message" TEXT;
        RAISE NOTICE 'Добавлена колонка message';
    ELSE
        RAISE NOTICE 'Колонка message уже существует';
    END IF;
END $$;

-- Проверяем существование колонки amount
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'HireRequest' AND column_name = 'amount'
    ) THEN
        ALTER TABLE "HireRequest" ADD COLUMN "amount" DECIMAL(10, 2) DEFAULT 1990.00;
        RAISE NOTICE 'Добавлена колонка amount';
    ELSE
        RAISE NOTICE 'Колонка amount уже существует';
    END IF;
END $$;

-- Обновляем существующие записи, если нужно
UPDATE "HireRequest" SET "amount" = 1990.00 WHERE "amount" IS NULL;

