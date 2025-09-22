-- CreateTable
CREATE TABLE "HireRequest" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "executorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "HireRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "HireRequest" ADD CONSTRAINT "HireRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HireRequest" ADD CONSTRAINT "HireRequest_executorId_fkey" FOREIGN KEY ("executorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
