-- Convert Post.status from PostStatus enum to TEXT, preserving all existing values
ALTER TABLE "Post" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Post" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
ALTER TABLE "Post" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- Drop the PostStatus enum type (no longer needed)
DROP TYPE "PostStatus";
