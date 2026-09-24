-- AlterEnum
ALTER TYPE "PostType" ADD VALUE 'CAROUSEL';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "carouselColors" JSONB,
ADD COLUMN     "carouselFonts" JSONB,
ADD COLUMN     "carouselStage" TEXT;

-- CreateTable
CREATE TABLE "CarouselSlide" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "headline" TEXT,
    "body" TEXT,
    "visualPrompt" TEXT NOT NULL,
    "layout" TEXT NOT NULL DEFAULT 'statement',
    "imagePath" TEXT,
    "imageModel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "design" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarouselSlide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarouselSlideImage" (
    "id" TEXT NOT NULL,
    "slideId" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarouselSlideImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarouselSlide_postId_idx" ON "CarouselSlide"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "CarouselSlide_postId_order_key" ON "CarouselSlide"("postId", "order");

-- CreateIndex
CREATE INDEX "CarouselSlideImage_slideId_idx" ON "CarouselSlideImage"("slideId");

-- AddForeignKey
ALTER TABLE "CarouselSlide" ADD CONSTRAINT "CarouselSlide_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarouselSlideImage" ADD CONSTRAINT "CarouselSlideImage_slideId_fkey" FOREIGN KEY ("slideId") REFERENCES "CarouselSlide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
