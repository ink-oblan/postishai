-- AlterTable - Convert String columns to JSONB
ALTER TABLE "BrandProfile"
  ALTER COLUMN "colors" TYPE jsonb USING NULLIF(colors, '')::jsonb,
  ALTER COLUMN "typography" TYPE jsonb USING NULLIF(typography, '')::jsonb,
  ALTER COLUMN "logoPath" TYPE jsonb USING NULLIF("logoPath", '')::jsonb,
  ALTER COLUMN "patterns" TYPE jsonb USING NULLIF(patterns, '')::jsonb;

-- Create GIN indexes for better JSON query performance
CREATE INDEX "BrandProfile_colors_idx" ON "BrandProfile" USING GIN (colors);
CREATE INDEX "BrandProfile_typography_idx" ON "BrandProfile" USING GIN (typography);
CREATE INDEX "BrandProfile_logoPath_idx" ON "BrandProfile" USING GIN ("logoPath");
CREATE INDEX "BrandProfile_patterns_idx" ON "BrandProfile" USING GIN (patterns);
