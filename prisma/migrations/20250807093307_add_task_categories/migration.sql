-- AlterTable
ALTER TABLE "Task"
  ADD COLUMN IF NOT EXISTS "subcategoryId" TEXT,
  ADD COLUMN IF NOT EXISTS "kanbanColumn" TEXT NOT NULL DEFAULT 'TODO',
  ADD COLUMN IF NOT EXISTS "kanbanOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subcategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subcategory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Task_subcategoryId_fkey'
      AND table_name = 'Task'
  ) THEN
    ALTER TABLE "Task"
      ADD CONSTRAINT "Task_subcategoryId_fkey"
      FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Subcategory_categoryId_fkey'
      AND table_name = 'Subcategory'
  ) THEN
    ALTER TABLE "Subcategory"
      ADD CONSTRAINT "Subcategory_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
