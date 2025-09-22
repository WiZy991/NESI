-- CreateTable
CREATE TABLE "CertificationTest" (
    "id" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "timeLimitSec" INTEGER NOT NULL,
    "passScore" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificationTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificationQuestion" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertificationQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificationOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CertificationOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificationAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "score" INTEGER,
    "passed" BOOLEAN,

    CONSTRAINT "CertificationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCertification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'CERTIFIED',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCertification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CertificationTest_subcategoryId_key" ON "CertificationTest"("subcategoryId");

-- CreateIndex
CREATE INDEX "CertificationQuestion_testId_idx" ON "CertificationQuestion"("testId");

-- CreateIndex
CREATE INDEX "CertificationOption_questionId_idx" ON "CertificationOption"("questionId");

-- CreateIndex
CREATE INDEX "CertificationAttempt_userId_idx" ON "CertificationAttempt"("userId");

-- CreateIndex
CREATE INDEX "CertificationAttempt_testId_idx" ON "CertificationAttempt"("testId");

-- CreateIndex
CREATE INDEX "CertificationAttempt_userId_testId_startedAt_idx" ON "CertificationAttempt"("userId", "testId", "startedAt");

-- CreateIndex
CREATE INDEX "UserCertification_subcategoryId_idx" ON "UserCertification"("subcategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCertification_userId_subcategoryId_key" ON "UserCertification"("userId", "subcategoryId");

-- AddForeignKey
ALTER TABLE "CertificationTest" ADD CONSTRAINT "CertificationTest_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificationQuestion" ADD CONSTRAINT "CertificationQuestion_testId_fkey" FOREIGN KEY ("testId") REFERENCES "CertificationTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificationOption" ADD CONSTRAINT "CertificationOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "CertificationQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificationAttempt" ADD CONSTRAINT "CertificationAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificationAttempt" ADD CONSTRAINT "CertificationAttempt_testId_fkey" FOREIGN KEY ("testId") REFERENCES "CertificationTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCertification" ADD CONSTRAINT "UserCertification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCertification" ADD CONSTRAINT "UserCertification_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
