-- AlterTable
ALTER TABLE "Avatar" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'GENERATED';

-- Backfill: avatars with no prompt were created via upload
UPDATE "Avatar"
SET "source" = 'UPLOADED'
WHERE "prompt" IS NULL;
