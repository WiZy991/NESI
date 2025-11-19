-- AlterTable
ALTER TABLE "Task" ADD COLUMN "skillsRequired" TEXT[] DEFAULT ARRAY[]::TEXT[];

