-- Создаём таблицу логов действий админа
CREATE TABLE IF NOT EXISTS "AdminActionLog" (
  "id" TEXT PRIMARY KEY,
  "adminId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "details" TEXT,
  "createdAt" TIMESTAMP DEFAULT now(),
  CONSTRAINT "AdminActionLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Создаём таблицу системных метрик
CREATE TABLE IF NOT EXISTS "SystemMetric" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "recordedAt" TIMESTAMP DEFAULT now()
);
