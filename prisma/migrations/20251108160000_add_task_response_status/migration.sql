-- CreateEnum
CREATE TYPE "TaskResponseStatus" AS ENUM ('pending', 'viewed', 'responded', 'hired', 'rejected');

-- AlterTable
ALTER TABLE "TaskResponse"
  ADD COLUMN "status" "TaskResponseStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Ensure updatedAt populated for existing rows
UPDATE "TaskResponse" SET "updatedAt" = NOW(), "status" = COALESCE("status", 'pending'::"TaskResponseStatus");

-- CreateTable
CREATE TABLE "TaskResponseStatusHistory" (
  "id" TEXT NOT NULL,
  "responseId" TEXT NOT NULL,
  "status" "TaskResponseStatus" NOT NULL,
  "note" TEXT,
  "changedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskResponseStatusHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TaskResponseStatusHistory"
  ADD CONSTRAINT "TaskResponseStatusHistory_responseId_fkey"
  FOREIGN KEY ("responseId") REFERENCES "TaskResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskResponseStatusHistory"
  ADD CONSTRAINT "TaskResponseStatusHistory_changedById_fkey"
  FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "TaskResponseStatusHistory_responseId_createdAt_idx"
  ON "TaskResponseStatusHistory" ("responseId", "createdAt");

