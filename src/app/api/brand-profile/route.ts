import type { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
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

/** Json columns, which the wizard sends as JSON-encoded strings. */
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
    const value = input[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== "string") return { error: `${field} must be a JSON string` };
    if (value.length > MAX_JSON_LENGTH) {
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

export const POST = withAuth(async function POST(request: NextRequest, _context, { userId }) {
  const body = await request.json();
  const parsed = parseBrandProfileInput(body);

  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
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
    return NextResponse.json(brandProfile);
  }

  const brandProfile = await prisma.brandProfile.create({
    data: { ...parsed.data, userId },
  });

  return NextResponse.json(brandProfile);
});

export const GET = withAuth(async function GET(_request: NextRequest, _context, { userId }) {
  const brandProfiles = await prisma.brandProfile.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(brandProfiles);
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
