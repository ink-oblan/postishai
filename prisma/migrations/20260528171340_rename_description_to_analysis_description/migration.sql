/*
  Warnings:

  - You are about to drop the column `description` on the `Avatar` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Avatar" DROP COLUMN "description",
ADD COLUMN     "analysisDescription" TEXT;
