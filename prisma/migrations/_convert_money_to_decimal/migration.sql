-- AlterTable User: convert balance and frozenBalance from INTEGER to DECIMAL(10,2)
ALTER TABLE "User" 
  ALTER COLUMN "balance" TYPE DECIMAL(10,2) USING "balance"::numeric,
  ALTER COLUMN "balance" SET DEFAULT 100.00,
  ALTER COLUMN "frozenBalance" TYPE DECIMAL(10,2) USING "frozenBalance"::numeric,
  ALTER COLUMN "frozenBalance" SET DEFAULT 0.00;

-- AlterTable Task: convert price and escrowAmount from INTEGER to DECIMAL(10,2)
ALTER TABLE "Task"
  ALTER COLUMN "price" TYPE DECIMAL(10,2) USING "price"::numeric,
  ALTER COLUMN "escrowAmount" TYPE DECIMAL(10,2) USING "escrowAmount"::numeric,
  ALTER COLUMN "escrowAmount" SET DEFAULT 0.00;

-- AlterTable TaskResponse: convert price from INTEGER to DECIMAL(10,2)
ALTER TABLE "TaskResponse"
  ALTER COLUMN "price" TYPE DECIMAL(10,2) USING "price"::numeric;

-- AlterTable Transaction: convert amount from INTEGER to DECIMAL(10,2)
ALTER TABLE "Transaction"
  ALTER COLUMN "amount" TYPE DECIMAL(10,2) USING "amount"::numeric;

-- AlterTable Subcategory: convert minPrice from INTEGER to DECIMAL(10,2)
ALTER TABLE "Subcategory"
  ALTER COLUMN "minPrice" TYPE DECIMAL(10,2) USING "minPrice"::numeric,
  ALTER COLUMN "minPrice" SET DEFAULT 500.00;

