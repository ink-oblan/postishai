/*
  Warnings:

  - You are about to drop the column `productId` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `onboardedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_productId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_userId_fkey";

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "productId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "onboardedAt";

-- DropTable
DROP TABLE "Product";

-- DropEnum
DROP TYPE "ProductCategory";
