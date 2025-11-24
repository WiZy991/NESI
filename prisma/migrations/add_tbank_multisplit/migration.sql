-- CreateEnum для статусов сделок
CREATE TYPE "DealStatus" AS ENUM ('OPEN', 'PARTIAL_CANCELED', 'CLOSED');

-- Таблица сделок Т-Банк Мультирасчеты
CREATE TABLE "TBankDeal" (
    "id" TEXT NOT NULL,
    "spAccumulationId" TEXT NOT NULL,
    "userId" TEXT,
    "dealType" TEXT NOT NULL DEFAULT 'NN',
    "status" "DealStatus" NOT NULL DEFAULT 'OPEN',
    "totalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "remainingBalance" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "TBankDeal_pkey" PRIMARY KEY ("id")
);

-- Таблица платежей (пополнений)
CREATE TABLE "TBankPayment" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" TEXT NOT NULL,
    "customerId" TEXT,
    "terminalKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "TBankPayment_pkey" PRIMARY KEY ("id")
);

-- Таблица выплат
CREATE TABLE "TBankPayout" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" TEXT NOT NULL,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "terminalKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TBankPayout_pkey" PRIMARY KEY ("id")
);

-- Уникальные индексы
CREATE UNIQUE INDEX "TBankDeal_spAccumulationId_key" ON "TBankDeal"("spAccumulationId");
CREATE UNIQUE INDEX "TBankPayment_paymentId_key" ON "TBankPayment"("paymentId");
CREATE UNIQUE INDEX "TBankPayment_orderId_key" ON "TBankPayment"("orderId");
CREATE UNIQUE INDEX "TBankPayout_paymentId_key" ON "TBankPayout"("paymentId");
CREATE UNIQUE INDEX "TBankPayout_orderId_key" ON "TBankPayout"("orderId");

-- Обычные индексы для быстрого поиска
CREATE INDEX "TBankDeal_spAccumulationId_idx" ON "TBankDeal"("spAccumulationId");
CREATE INDEX "TBankDeal_userId_idx" ON "TBankDeal"("userId");
CREATE INDEX "TBankDeal_status_idx" ON "TBankDeal"("status");
CREATE INDEX "TBankDeal_createdAt_idx" ON "TBankDeal"("createdAt");

CREATE INDEX "TBankPayment_dealId_idx" ON "TBankPayment"("dealId");
CREATE INDEX "TBankPayment_paymentId_idx" ON "TBankPayment"("paymentId");
CREATE INDEX "TBankPayment_orderId_idx" ON "TBankPayment"("orderId");
CREATE INDEX "TBankPayment_status_idx" ON "TBankPayment"("status");

CREATE INDEX "TBankPayout_dealId_idx" ON "TBankPayout"("dealId");
CREATE INDEX "TBankPayout_paymentId_idx" ON "TBankPayout"("paymentId");
CREATE INDEX "TBankPayout_orderId_idx" ON "TBankPayout"("orderId");
CREATE INDEX "TBankPayout_recipientId_idx" ON "TBankPayout"("recipientId");
CREATE INDEX "TBankPayout_status_idx" ON "TBankPayout"("status");

-- Внешние ключи
ALTER TABLE "TBankDeal" ADD CONSTRAINT "TBankDeal_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TBankPayment" ADD CONSTRAINT "TBankPayment_dealId_fkey" 
    FOREIGN KEY ("dealId") REFERENCES "TBankDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TBankPayout" ADD CONSTRAINT "TBankPayout_dealId_fkey" 
    FOREIGN KEY ("dealId") REFERENCES "TBankDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

