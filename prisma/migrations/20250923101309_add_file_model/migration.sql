/*
  Warnings:

  - A unique constraint covering the columns `[avatarFileId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."CertificationTest" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."Message" ADD COLUMN     "fileId" TEXT;

-- AlterTable
ALTER TABLE "public"."PrivateMessage" ADD COLUMN     "fileId" TEXT;

-- AlterTable
ALTER TABLE "public"."Subcategory" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "avatarFileId" TEXT;

-- CreateTable
CREATE TABLE "public"."File" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_avatarFileId_key" ON "public"."User"("avatarFileId");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_avatarFileId_fkey" FOREIGN KEY ("avatarFileId") REFERENCES "public"."File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "public"."File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PrivateMessage" ADD CONSTRAINT "PrivateMessage_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "public"."File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
