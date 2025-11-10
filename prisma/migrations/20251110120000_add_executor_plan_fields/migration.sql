-- Добавляем поля личного плана исполнителя
ALTER TABLE "Task"
	ADD COLUMN "executorPlannedStart" TIMESTAMP,
	ADD COLUMN "executorPlannedDeadline" TIMESTAMP,
	ADD COLUMN "executorPlanNote" TEXT;

