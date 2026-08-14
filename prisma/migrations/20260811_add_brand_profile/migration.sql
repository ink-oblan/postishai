-- CreateTable "BrandProfile"
CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "mission" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "colors" TEXT,
    "typography" TEXT,
    "logoPath" TEXT,
    "patterns" TEXT,
    "photoStyle" TEXT,
    "voiceStyle" TEXT,
    "youFormality" BOOLEAN NOT NULL DEFAULT false,
    "emojiLevel" INTEGER NOT NULL DEFAULT 1,
    "brandVocabulary" TEXT,
    "videoAnimations" TEXT,
    "videoTransitions" TEXT,
    "competitors" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandProfile_userId_key" ON "BrandProfile"("userId");

-- AddForeignKey
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
