-- CreateTable
CREATE TABLE "HeyGenVoice" (
    "id" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "previewAudio" TEXT,
    "raw" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeyGenVoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HeyGenVoice_voiceId_key" ON "HeyGenVoice"("voiceId");

-- CreateIndex
CREATE INDEX "HeyGenVoice_language_gender_name_idx" ON "HeyGenVoice"("language", "gender", "name");
