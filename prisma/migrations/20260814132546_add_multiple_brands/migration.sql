-- Add brandProfileId to Post table (if not already exists)
ALTER TABLE "Post" ADD COLUMN "brandProfileId" TEXT;

-- Add foreign key constraint for brandProfileId
ALTER TABLE "Post" ADD CONSTRAINT "Post_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "BrandProfile"("id") ON DELETE SET NULL;
