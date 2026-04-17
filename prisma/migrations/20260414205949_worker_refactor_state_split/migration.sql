CREATE TABLE "new_Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "dedupeKey" TEXT,
    "runAfter" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" DATETIME,
    "lockedBy" TEXT,
    "error" TEXT,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_Job" (
    "id",
    "type",
    "payload",
    "status",
    "attempts",
    "maxAttempts",
    "dedupeKey",
    "runAfter",
    "lockedAt",
    "lockedBy",
    "error",
    "finishedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "type",
    "payload",
    "status",
    "attempts",
    3,
    NULL,
    CURRENT_TIMESTAMP,
    NULL,
    NULL,
    "error",
    NULL,
    "createdAt",
    "updatedAt"
FROM "Job";

DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";

ALTER TABLE "Post" ADD COLUMN "metadataStatus" TEXT NOT NULL DEFAULT 'IDLE';
ALTER TABLE "Post" ADD COLUMN "metadataErrorMessage" TEXT;
ALTER TABLE "Post" ADD COLUMN "metadataUpdatedAt" DATETIME;

UPDATE "Post"
SET
    "metadataStatus" = CASE
        WHEN "metadata" IS NOT NULL THEN 'COMPLETED'
        ELSE 'IDLE'
    END,
    "metadataUpdatedAt" = CASE
        WHEN "metadata" IS NOT NULL THEN COALESCE("updatedAt", "createdAt")
        ELSE NULL
    END,
    "metadataErrorMessage" = NULL;
