/**
 * Assigns a random HeyGen voice to avatars that have no voiceId set.
 * Run with: npx tsx scripts/assign-missing-voices.ts
 */
import "dotenv/config";
import { prisma } from "../lib/db";
import { listVoices } from "../lib/heygen/client";

async function main() {
  const avatars = await prisma.avatar.findMany({
    where: { voiceId: "" },
    select: { id: true, name: true },
  });

  if (avatars.length === 0) {
    console.log("All avatars already have voices.");
    return;
  }

  console.log(`Found ${avatars.length} avatar(s) without a voice. Fetching HeyGen voices...`);
  const voices = await listVoices();
  const english = voices.filter((v) => v.language === "English");
  if (english.length === 0) throw new Error("No English voices returned from HeyGen");

  for (const avatar of avatars) {
    const voice = english[Math.floor(Math.random() * english.length)];
    await prisma.avatar.update({
      where: { id: avatar.id },
      data: { voiceId: voice.voice_id },
    });
    console.log(`  ${avatar.name} → ${voice.name} (${voice.voice_id})`);
  }

  console.log("Done.");
}

main().finally(() => prisma.$disconnect());
