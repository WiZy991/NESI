/*
  Warnings:

  - A unique constraint covering the columns `[postId,userId]` on the table `CommunityLike` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."CommunityLike_userId_postId_key";

-- AlterTable
ALTER TABLE "public"."CommunityComment" ADD COLUMN     "imageUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CommunityLike_postId_userId_key" ON "public"."CommunityLike"("postId", "userId");
