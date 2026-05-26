-- If origin is set, it wins over ethnicity.
UPDATE "Avatar"
SET "ethnicity" = "origin"
WHERE "origin" IS NOT NULL;

-- Drop the old separate origin column.
ALTER TABLE "Avatar" DROP COLUMN "origin";

-- Rename ethnicity to origin (this field now holds the unified "where from" value).
ALTER TABLE "Avatar" RENAME COLUMN "ethnicity" TO "origin";
