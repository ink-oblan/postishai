import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { listVoices } from "./client";
import type { HeyGenVoice } from "./types";

const VOICE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function isFresh(lastSeenAt: Date) {
  return Date.now() - lastSeenAt.getTime() < VOICE_CACHE_TTL_MS;
}

function toHeyGenVoice(voice: {
  voiceId: string;
  name: string;
  language: string;
  gender: string;
  previewAudio: string | null;
}): HeyGenVoice {
  return {
    voice_id: voice.voiceId,
    name: voice.name,
    language: voice.language,
    gender: voice.gender,
    preview_audio: voice.previewAudio ?? undefined,
  };
}

async function readCachedVoices() {
  const voices = await prisma.heyGenVoice.findMany({
    where: { active: true },
    orderBy: [{ name: "asc" }, { voiceId: "asc" }],
  });

  return voices.map(toHeyGenVoice);
}

async function newestCachedVoice() {
  return prisma.heyGenVoice.findFirst({
    where: { active: true },
    orderBy: { lastSeenAt: "desc" },
    select: { lastSeenAt: true },
  });
}

export async function refreshHeyGenVoiceCache(): Promise<HeyGenVoice[]> {
  const voices = await listVoices();
  if (voices.length === 0) {
    throw new Error("HeyGen returned no voices");
  }

  const now = new Date();
  const voiceIds = voices.map((voice) => voice.voice_id);

  // Batch upserts in chunks to avoid transaction timeout
  // Processing all voices in one transaction was causing 5s+ operations
  const BATCH_SIZE = 10;
  for (let i = 0; i < voices.length; i += BATCH_SIZE) {
    const batch = voices.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      batch.map((voice) =>
        prisma.heyGenVoice.upsert({
          where: { voiceId: voice.voice_id },
          create: {
            voiceId: voice.voice_id,
            name: voice.name,
            language: voice.language,
            gender: voice.gender,
            previewAudio: voice.preview_audio ?? null,
            raw: voice as unknown as Prisma.InputJsonValue,
            active: true,
            lastSeenAt: now,
          },
          update: {
            name: voice.name,
            language: voice.language,
            gender: voice.gender,
            previewAudio: voice.preview_audio ?? null,
            raw: voice as unknown as Prisma.InputJsonValue,
            active: true,
            lastSeenAt: now,
          },
        }),
      ),
    );
  }

  // Mark voices that are no longer from HeyGen as inactive
  await prisma.heyGenVoice.updateMany({
    where: { voiceId: { notIn: voiceIds }, active: true },
    data: { active: false },
  });

  return readCachedVoices();
}

export async function listCachedHeyGenVoices(): Promise<HeyGenVoice[]> {
  const newest = await newestCachedVoice();
  if (newest && isFresh(newest.lastSeenAt)) {
    return readCachedVoices();
  }

  try {
    return await refreshHeyGenVoiceCache();
  } catch (error) {
    const cached = await readCachedVoices();
    if (cached.length > 0) {
      console.warn("[heygen voices cache] refresh failed; serving stale voices", error);
      return cached;
    }

    throw error;
  }
}
