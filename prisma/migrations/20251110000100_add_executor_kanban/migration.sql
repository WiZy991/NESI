-- Add executor kanban fields for tasks
ALTER TABLE "Task"
    ADD COLUMN IF NOT EXISTS "executorKanbanColumn" TEXT NOT NULL DEFAULT 'TODO',
    ADD COLUMN IF NOT EXISTS "executorKanbanOrder" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "executorNote" TEXT;

