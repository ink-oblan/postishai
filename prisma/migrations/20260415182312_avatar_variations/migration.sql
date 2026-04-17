/*
  Warnings:

  - You are about to drop the column `voiceId` on the `Post` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "AvatarVariation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "avatarId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "clothes" TEXT,
    "background" TEXT,
    "pose" TEXT,
    "prompt" TEXT,
    "imageModel" TEXT,
    "imagePath" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "heygenAssetId" TEXT,
    "heygenAssetUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AvatarVariation_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Avatar" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Avatar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "prompt" TEXT,
    "imageModel" TEXT,
    "imagePath" TEXT NOT NULL,
    "gender" TEXT,
    "age" INTEGER,
    "ethnicity" TEXT,
    "origin" TEXT,
    "occupation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "errorMessage" TEXT,
    "voiceId" TEXT NOT NULL DEFAULT '',
    "heygenAssetId" TEXT,
    "heygenAssetUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "archivedAt" DATETIME
);
INSERT INTO "new_Avatar" ("age", "archivedAt", "createdAt", "errorMessage", "ethnicity", "gender", "heygenAssetId", "heygenAssetUrl", "id", "imageModel", "imagePath", "name", "occupation", "origin", "prompt", "status", "updatedAt") SELECT "age", "archivedAt", "createdAt", "errorMessage", "ethnicity", "gender", "heygenAssetId", "heygenAssetUrl", "id", "imageModel", "imagePath", "name", "occupation", "origin", "prompt", "status", "updatedAt" FROM "Avatar";
DROP TABLE "Avatar";
ALTER TABLE "new_Avatar" RENAME TO "Avatar";
CREATE TABLE "new_Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "script" TEXT NOT NULL,
    "avatarId" TEXT NOT NULL,
    "avatarVariationId" TEXT,
    "llmModelId" TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "generationStartedAt" DATETIME,
    "heygenVideoId" TEXT,
    "videoPath" TEXT,
    "heygenVideoUrl" TEXT,
    "metadata" TEXT,
    "metadataStatus" TEXT NOT NULL DEFAULT 'IDLE',
    "metadataErrorMessage" TEXT,
    "metadataUpdatedAt" DATETIME,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "archivedAt" DATETIME,
    CONSTRAINT "Post_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Avatar" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Post_avatarVariationId_fkey" FOREIGN KEY ("avatarVariationId") REFERENCES "AvatarVariation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("archivedAt", "avatarId", "createdAt", "errorMessage", "generationStartedAt", "heygenVideoId", "heygenVideoUrl", "id", "llmModelId", "metadata", "metadataErrorMessage", "metadataStatus", "metadataUpdatedAt", "platform", "script", "status", "title", "updatedAt", "videoPath") SELECT "archivedAt", "avatarId", "createdAt", "errorMessage", "generationStartedAt", "heygenVideoId", "heygenVideoUrl", "id", "llmModelId", "metadata", "metadataErrorMessage", "metadataStatus", "metadataUpdatedAt", "platform", "script", "status", "title", "updatedAt", "videoPath" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
