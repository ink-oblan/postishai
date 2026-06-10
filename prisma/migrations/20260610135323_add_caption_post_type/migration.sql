-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('AVATAR_VIDEO', 'CAPTION');

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_avatarId_fkey";

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "caption" TEXT,
ADD COLUMN     "type" "PostType" NOT NULL DEFAULT 'AVATAR_VIDEO',
ALTER COLUMN "script" DROP NOT NULL,
ALTER COLUMN "avatarId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PostMedia" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostMedia_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Avatar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostMedia" ADD CONSTRAINT "PostMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
