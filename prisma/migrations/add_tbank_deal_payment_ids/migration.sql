-- AlterTable: Добавляем поля dealId и paymentId в таблицу Transaction
ALTER TABLE "Transaction" ADD COLUMN "dealId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "paymentId" TEXT;

-- CreateIndex: Индексы для быстрого поиска по dealId и paymentId
CREATE INDEX "Transaction_dealId_idx" ON "Transaction"("dealId");
CREATE INDEX "Transaction_paymentId_idx" ON "Transaction"("paymentId");

