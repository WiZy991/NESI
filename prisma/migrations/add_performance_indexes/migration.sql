-- Добавление индексов для оптимизации производительности
-- Эти индексы улучшат производительность частых запросов

-- 1. Составной индекс для PrivateMessage с OR условием (senderId OR recipientId)
-- Используется в /api/chats для получения всех сообщений пользователя
CREATE INDEX IF NOT EXISTS "idx_private_messages_user_created" 
ON "PrivateMessage"("senderId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "idx_private_messages_recipient_created" 
ON "PrivateMessage"("recipientId", "createdAt" DESC);

-- 2. Составной индекс для подсчета непрочитанных приватных сообщений
-- Используется для подсчета непрочитанных сообщений в /api/chats
CREATE INDEX IF NOT EXISTS "idx_private_messages_unread_count"
ON "PrivateMessage"("recipientId", "senderId", "createdAt" DESC)
WHERE "deletedAt" IS NULL;

-- 3. Составной индекс для Message с taskId и senderId
-- Используется для получения сообщений задач в /api/chats
CREATE INDEX IF NOT EXISTS "idx_messages_task_sender_created"
ON "Message"("taskId", "senderId", "createdAt" DESC)
WHERE "deletedAt" IS NULL;

-- 4. Индекс для подсчета непрочитанных сообщений задач
-- Используется для подсчета непрочитанных сообщений в чатах задач
CREATE INDEX IF NOT EXISTS "idx_messages_task_unread"
ON "Message"("taskId", "createdAt" DESC)
WHERE "deletedAt" IS NULL;

-- 5. Индекс для User.lastPrivateMessageReadAt (если используется для фильтрации)
-- Улучшит производительность запросов с условием по времени прочтения
CREATE INDEX IF NOT EXISTS "idx_user_last_private_read"
ON "User"("lastPrivateMessageReadAt")
WHERE "lastPrivateMessageReadAt" IS NOT NULL;

-- 6. Составной индекс для Task с фильтрами (status, createdAt, subcategoryId)
-- Улучшит производительность каталога задач
CREATE INDEX IF NOT EXISTS "idx_tasks_catalog"
ON "Task"("status", "subcategoryId", "createdAt" DESC)
WHERE "status" IN ('open', 'in_progress');

-- 7. Индекс для TaskResponse с фильтрацией по статусу
-- Улучшит производительность запросов откликов
CREATE INDEX IF NOT EXISTS "idx_task_responses_status_created"
ON "TaskResponse"("status", "createdAt" DESC);

-- Примечание: Индексы уже существуют для:
-- - Notification (userId, isRead, createdAt) - уже есть
-- - Task (status, createdAt) - уже есть
-- - Message (taskId, createdAt) - уже есть
-- - PrivateMessage (senderId, recipientId, createdAt) - уже есть

