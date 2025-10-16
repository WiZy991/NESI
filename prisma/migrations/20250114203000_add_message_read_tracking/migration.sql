-- Add message read tracking fields
ALTER TABLE "User" ADD COLUMN "last_private_message_read_at" TIMESTAMP(3);

ALTER TABLE "Task" ADD COLUMN "customer_last_read_at" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "executor_last_read_at" TIMESTAMP(3);
