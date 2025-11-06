-- Миграция: добавление поля mediaType в таблицу Portfolio
-- Запустите этот SQL скрипт вручную, если Prisma Migrate не может создать shadow database

ALTER TABLE "Portfolio" 
ADD COLUMN IF NOT EXISTS "mediaType" TEXT DEFAULT 'image';

-- Обновляем существующие записи, чтобы они были 'image' по умолчанию
UPDATE "Portfolio" 
SET "mediaType" = 'image' 
WHERE "mediaType" IS NULL;

