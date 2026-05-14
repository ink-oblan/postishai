-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('MOBILE_APP', 'SAAS', 'WEB', 'GAME', 'OTHER');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "productId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT,
    "tagline" TEXT,
    "description" TEXT,
    "category" "ProductCategory",
    "audience" TEXT,
    "tone" TEXT,
    "keyFeatures" JSONB,
    "cta" TEXT,
    "rawScrape" JSONB,
    "scrapeStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "lastScrapedAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_userId_idx" ON "Product"("userId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
