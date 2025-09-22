-- DropForeignKey
ALTER TABLE "TaskResponse" DROP CONSTRAINT "TaskResponse_taskId_fkey";

-- AddForeignKey
ALTER TABLE "TaskResponse" ADD CONSTRAINT "TaskResponse_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
