-- Добавление полей для ответов на сообщения
-- Migration: add_reply_to_messages

-- Добавляем replyToId в таблицу Message
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "replyToId" TEXT;

-- Добавляем внешний ключ для Message.replyToId
CREATE INDEX IF NOT EXISTS "Message_replyToId_idx" ON "Message"("replyToId");

-- Добавляем replyToId в таблицу PrivateMessage
ALTER TABLE "PrivateMessage" ADD COLUMN IF NOT EXISTS "replyToId" TEXT;

-- Добавляем внешний ключ для PrivateMessage.replyToId
CREATE INDEX IF NOT EXISTS "PrivateMessage_replyToId_idx" ON "PrivateMessage"("replyToId");

-- Добавляем внешние ключи (если они еще не существуют)
-- Для Message
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Message_replyToId_fkey'
    ) THEN
        ALTER TABLE "Message" 
        ADD CONSTRAINT "Message_replyToId_fkey" 
        FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- Для PrivateMessage
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'PrivateMessage_replyToId_fkey'
    ) THEN
        ALTER TABLE "PrivateMessage" 
        ADD CONSTRAINT "PrivateMessage_replyToId_fkey" 
        FOREIGN KEY ("replyToId") REFERENCES "PrivateMessage"("id") ON DELETE SET NULL;
    END IF;
END $$;

