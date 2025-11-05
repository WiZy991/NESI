-- AlterTable
-- Добавляем поле targetRole в таблицу Badge для фильтрации достижений по ролям
ALTER TABLE "Badge" ADD COLUMN IF NOT EXISTS "targetRole" TEXT;

-- Создаем индекс для оптимизации запросов по targetRole
CREATE INDEX IF NOT EXISTS "Badge_targetRole_idx" ON "Badge"("targetRole");
