-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "brandProfileId" TEXT;

-- CreateTable
CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "mission" TEXT,
    "colors" JSONB,
    "typography" JSONB,
    "logoPath" JSONB,
    "patterns" JSONB,
    "photoStyle" TEXT,
    "youFormality" BOOLEAN NOT NULL DEFAULT false,
    "emojiLevel" INTEGER NOT NULL DEFAULT 0,
    "voiceStyle" TEXT,
    "brandVocabulary" TEXT,
    "videoAnimations" TEXT,
    "videoTransitions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brandProfileId" TEXT,
    "type" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandProfile_userId_brandName_key" ON "BrandProfile"("userId", "brandName");

-- CreateIndex
CREATE INDEX "BrandProfile_createdAt_idx" ON "BrandProfile"("createdAt");

-- CreateIndex
CREATE INDEX "BrandAsset_userId_idx" ON "BrandAsset"("userId");

-- CreateIndex
CREATE INDEX "BrandAsset_brandProfileId_idx" ON "BrandAsset"("brandProfileId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "BrandProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAsset" ADD CONSTRAINT "BrandAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAsset" ADD CONSTRAINT "BrandAsset_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "BrandProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
