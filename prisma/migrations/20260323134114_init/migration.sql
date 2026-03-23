-- CreateTable
CREATE TABLE "Avatar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "prompt" TEXT,
    "imageModel" TEXT,
    "imagePath" TEXT NOT NULL,
    "heygenAssetId" TEXT,
    "heygenAssetUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "script" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,
    "avatarId" TEXT NOT NULL,
    "llmModelId" TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "heygenVideoId" TEXT,
    "videoPath" TEXT,
    "heygenVideoUrl" TEXT,
    "metadata" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Post_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Avatar" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
