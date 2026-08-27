import type { BrandProfile, Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { extractAssetIds } from "@/lib/brand-assets";
import { prisma } from "@/lib/db";

const MAX_TEXT_LENGTH = 2_000;
const MAX_JSON_LENGTH = 100_000;

/** Free-text columns the wizard is allowed to write. */
const TEXT_FIELDS = [
  "brandName",
  "topic",
  "targetAudience",
  "mission",
  "photoStyle",
  "voiceStyle",
  "brandVocabulary",
  "videoAnimations",
  "videoTransitions",
] as const;

/** Json columns, each holding a list of entries (colours, fonts, uploaded assets). */
const JSON_FIELDS = ["colors", "typography", "logoPath", "patterns"] as const;

const REQUIRED_FIELDS = ["brandName", "targetAudience", "topic"] as const;

type BrandProfileInput = Omit<Prisma.BrandProfileUncheckedCreateInput, "id" | "userId">;

/**
 * Build the Prisma payload from an explicit allow-list. Never spread the request body:
 * unknown keys would otherwise let a caller write `userId`, relation connects, or any
 * other column on the model.
 */
function parseBrandProfileInput(body: unknown): { data: BrandProfileInput } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Invalid request body" };
  }
  const input = body as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  for (const field of TEXT_FIELDS) {
    const value = input[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== "string") return { error: `${field} must be a string` };
    if (value.length > MAX_TEXT_LENGTH) {
      return { error: `${field} exceeds ${MAX_TEXT_LENGTH} characters` };
    }
    data[field] = value;
  }

  for (const field of JSON_FIELDS) {
    const raw = input[field];
    // The wizard seeds untouched list fields with "", meaning "not set".
    if (raw === undefined || raw === null || raw === "") continue;

    let value = raw;
    if (typeof value === "string") {
      // Tolerated for JSON sent as text; decoded so the column stores a real array
      // rather than a string that every reader would have to unwrap again.
      try {
        value = JSON.parse(value);
      } catch {
        return { error: `${field} must be valid JSON` };
      }
    }
    if (!Array.isArray(value)) return { error: `${field} must be a list` };
    if (JSON.stringify(value).length > MAX_JSON_LENGTH) {
      return { error: `${field} exceeds ${MAX_JSON_LENGTH} characters` };
    }
    data[field] = value;
  }

  if (input.youFormality !== undefined) {
    if (typeof input.youFormality !== "boolean") {
      return { error: "youFormality must be a boolean" };
    }
    data.youFormality = input.youFormality;
  }

  if (input.emojiLevel !== undefined) {
    const level = input.emojiLevel;
    if (typeof level !== "number" || !Number.isInteger(level) || level < 0 || level > 3) {
      return { error: "emojiLevel must be an integer between 0 and 3" };
    }
    data.emojiLevel = level;
  }

  for (const field of REQUIRED_FIELDS) {
    if (!data[field]) {
      return { error: `Missing required fields: ${REQUIRED_FIELDS.join(", ")}` };
    }
  }

  return { data: data as BrandProfileInput };
}

/** The three wizard fields whose entries can carry an uploaded asset. */
const ASSET_FIELDS = ["logoPath", "patterns", "typography"] as const;

function referencedAssetIds(source: Partial<Record<(typeof ASSET_FIELDS)[number], unknown>>) {
  return [...new Set(ASSET_FIELDS.flatMap((field) => extractAssetIds(source[field])))];
}

/**
 * Point every asset the saved brand references at it, and release the ones it no longer
 * does. Reads the ids back off the persisted row rather than the request, so a partial
 * update can't release assets held by a field it never sent.
 */
async function linkAssets(userId: string, brandProfile: BrandProfile): Promise<void> {
  const assetIds = referencedAssetIds(brandProfile);

  await prisma.brandAsset.updateMany({
    where: { userId, id: { in: assetIds } },
    data: { brandProfileId: brandProfile.id },
  });

  await prisma.brandAsset.updateMany({
    where: { userId, brandProfileId: brandProfile.id, id: { notIn: assetIds } },
    data: { brandProfileId: null },
  });
}

export const POST = withAuth(async function POST(request: NextRequest, _context, { userId }) {
  const body = await request.json();
  const parsed = parseBrandProfileInput(body);

  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Reject unknown or someone else's asset ids before they are written into the brand.
  const incomingAssetIds = referencedAssetIds(parsed.data);
  if (incomingAssetIds.length > 0) {
    const owned = await prisma.brandAsset.count({
      where: { userId, id: { in: incomingAssetIds } },
    });
    if (owned !== incomingAssetIds.length) {
      return NextResponse.json({ error: "Unknown asset reference" }, { status: 400 });
    }
  }

  const brandProfileId = typeof body?.brandProfileId === "string" ? body.brandProfileId : null;

  if (brandProfileId) {
    // Scope the update by userId so it can only ever touch the caller's own brand.
    const { count } = await prisma.brandProfile.updateMany({
      where: { id: brandProfileId, userId },
      data: parsed.data,
    });

    if (count === 0) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const brandProfile = await prisma.brandProfile.findUniqueOrThrow({
      where: { id: brandProfileId },
    });
    await linkAssets(userId, brandProfile);
    return NextResponse.json(brandProfile);
  }

  const brandProfile = await prisma.brandProfile.create({
    data: { ...parsed.data, userId },
  });
  await linkAssets(userId, brandProfile);

  return NextResponse.json(brandProfile);
});

export const DELETE = withAuth(async function DELETE(request: NextRequest, _context, { userId }) {
  const brandProfileId = request.nextUrl.searchParams.get("id");

  if (!brandProfileId) {
    return NextResponse.json({ error: "Missing brandProfileId parameter" }, { status: 400 });
  }

  const { count } = await prisma.brandProfile.deleteMany({
    where: { id: brandProfileId, userId },
  });

  if (count === 0) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
});
