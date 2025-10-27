-- Оптимизация: Составные индексы для часто используемых запросов
-- Выполнить на сервере: psql -U nesi_user -d nesi_db -h localhost < add_indexes.sql

-- 1. Задачи: статус + дата создания (для списка задач)
CREATE INDEX IF NOT EXISTS idx_tasks_status_created 
  ON "Task"(status, "createdAt" DESC);

-- 2. Задачи: заказчик + статус (для "мои задачи")
CREATE INDEX IF NOT EXISTS idx_tasks_customer_status_created
  ON "Task"("customerId", status, "createdAt" DESC);

-- 3. Задачи: исполнитель + статус (для выполненных задач)
CREATE INDEX IF NOT EXISTS idx_tasks_executor_status_created
  ON "Task"("executorId", status, "createdAt" DESC);

-- 4. Сообщения: задача + дата (для чата в задаче)
CREATE INDEX IF NOT EXISTS idx_messages_task_created 
  ON "Message"("taskId", "createdAt" DESC);

-- 5. Уведомления: пользователь + прочитано + дата
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
  ON "Notification"("userId", "isRead", "createdAt" DESC);

-- 6. Приватные сообщения: отправитель + получатель + дата
CREATE INDEX IF NOT EXISTS idx_private_messages_sender_created
  ON "PrivateMessage"("senderId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_private_messages_recipient_created
  ON "PrivateMessage"("recipientId", "createdAt" DESC);

-- 7. Посты сообщества: автор + дата
CREATE INDEX IF NOT EXISTS idx_community_posts_author_created
  ON "CommunityPost"("authorId", "createdAt" DESC);

-- 8. Комментарии: пост + дата
CREATE INDEX IF NOT EXISTS idx_community_comments_post_created
  ON "CommunityComment"("postId", "createdAt" DESC);

-- 9. Транзакции: пользователь + дата + статус
CREATE INDEX IF NOT EXISTS idx_transactions_user_created_status
  ON "Transaction"("userId", "createdAt" DESC, status);

-- 10. Отклики на задачи: задача + дата
CREATE INDEX IF NOT EXISTS idx_task_responses_task_created
  ON "TaskResponse"("taskId", "createdAt" DESC);

-- Проверка созданных индексов
SELECT 
    tablename, 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Анализ таблиц для обновления статистики
ANALYZE "Task";
ANALYZE "Message";
ANALYZE "Notification";
ANALYZE "PrivateMessage";
ANALYZE "CommunityPost";
ANALYZE "CommunityComment";
ANALYZE "Transaction";
ANALYZE "TaskResponse";

-- Вывести информацию о размере индексов
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid::regclass)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid::regclass) DESC;

