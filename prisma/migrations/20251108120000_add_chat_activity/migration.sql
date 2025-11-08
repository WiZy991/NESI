-- Create table for tracking per-chat activity
CREATE TABLE "ChatActivity" (
  "id" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "chatType" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lastReadAt" TIMESTAMP(3),
  "lastActivityAt" TIMESTAMP(3),
  "typingAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatActivity_pkey" PRIMARY KEY ("id")
);

-- Ensure unique entry per user per chat
CREATE UNIQUE INDEX "ChatActivity_chatType_chatId_userId_key"
  ON "ChatActivity" ("chatType", "chatId", "userId");

-- Helpful indexes for lookups
CREATE INDEX "ChatActivity_userId_idx" ON "ChatActivity" ("userId");
CREATE INDEX "ChatActivity_chatType_chatId_idx" ON "ChatActivity" ("chatType", "chatId");

-- Maintain referential integrity with users
ALTER TABLE "ChatActivity"
  ADD CONSTRAINT "ChatActivity_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

