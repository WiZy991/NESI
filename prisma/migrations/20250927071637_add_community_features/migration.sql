/*
  Warnings:

  - You are about to drop the column `createdAt` on the `CommunityLike` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,postId]` on the table `CommunityLike` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."CommunityLike_postId_userId_key";

-- AlterTable
ALTER TABLE "public"."CommunityComment" ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "public"."CommunityLike" DROP COLUMN "createdAt";

-- CreateTable
CREATE TABLE "public"."CommunityView" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityLike_userId_postId_key" ON "public"."CommunityLike"("userId", "postId");

-- AddForeignKey
ALTER TABLE "public"."CommunityView" ADD CONSTRAINT "CommunityView_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."CommunityPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
