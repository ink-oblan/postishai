import { type BrandProfile, Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { extractAssetIds } from "@/lib/brand-assets";
import {
  ASSET_FIELDS,
  BRAND_FIELD_NAMES,
  type BrandFieldName,
  invalidFieldMessage,
  isListField,
  parseWholeField,
  seedFormData,
  validateField,
} from "@/lib/brand-fields";
import { prisma } from "@/lib/db";
import { deleteFile } from "@/lib/storage";

type BrandProfileInput = Omit<Prisma.BrandProfileUncheckedCreateInput, "id" | "userId">;

/**
 * Build the Prisma payload from the field registry, which is an allow-list by construction.
 * Never spread the request body: unknown keys would otherwise let a caller write `userId`,
 * relation connects, or any other column on the model.
 *
 * Each value has to survive its field's parser whole. Refusing a partial parse is what keeps
 * a stale client from writing entries no reader can make sense of — a list is stored as the
 * caller meant it or not at all.
 */
function parseBrandProfileInput(body: unknown): { data: BrandProfileInput } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Invalid request body" };
  }
  const input = body as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  for (const field of BRAND_FIELD_NAMES) {
    const raw = input[field];
    // Absent means "not sent", so a partial update leaves the column alone. The wizard also
    // seeds untouched list fields with "", which older clients still post as "not set" —
    // text fields keep it, since "" is how the user clears one.
    if (raw === undefined || raw === null) continue;
    if (raw === "" && isListField(field)) continue;

    const value = parseWholeField(field, raw);
    if (value === undefined) return { error: invalidFieldMessage(field) };

    data[field] = value;
  }

  return { data: data as BrandProfileInput };
}

function brandProfileError(effective: Partial<Record<BrandFieldName, unknown>>): string | null {
  for (const field of BRAND_FIELD_NAMES) {
    const error = validateField(field, effective[field]);
    if (error) return error.message;
  }

  return null;
}

async function brandNameTaken(
  userId: string,
  brandName: unknown,
  excludeId: string | null,
): Promise<boolean> {
  if (typeof brandName !== "string" || brandName === "") return false;

  const conflict = await prisma.brandProfile.findFirst({
    where: {
      userId,
      brandName: { equals: brandName, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });

  return conflict !== null;
}

const BRAND_NAME_CONSTRAINT = ["userId", "brandName"];

function isDuplicateBrandName(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;
  return (
    Array.isArray(target) &&
    target.length === BRAND_NAME_CONSTRAINT.length &&
    BRAND_NAME_CONSTRAINT.every((column) => target.includes(column))
  );
}

function duplicateBrandNameResponse(brandName: unknown): NextResponse {
  const name = typeof brandName === "string" ? brandName : "";

  return NextResponse.json(
    { error: `You already have a brand named "${name}"`, field: "brandName" },
    { status: 409 },
  );
}

function referencedAssetIds(source: Partial<Record<BrandFieldName, unknown>>) {
  return [...new Set(ASSET_FIELDS.flatMap((field) => extractAssetIds(source[field])))];
}

/**
 * Point every asset the saved brand references at it, and release the ones it no longer
 * does. Reads the ids back off the persisted row rather than the request, so a partial
 * update can't release assets held by a field it never sent.
 */
async function linkAssets(
  tx: Prisma.TransactionClient,
  userId: string,
  brandProfile: BrandProfile,
): Promise<void> {
  const assetIds = referencedAssetIds(brandProfile);

  await tx.brandAsset.updateMany({
    where: { userId, id: { in: assetIds } },
    data: { brandProfileId: brandProfile.id },
  });
  await tx.brandAsset.updateMany({
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

  if (typeof parsed.data.brandName === "string") {
    parsed.data.brandName = parsed.data.brandName.trim();
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
    const existing = await prisma.brandProfile.findFirst({ where: { id: brandProfileId, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const error = brandProfileError({ ...existing, ...parsed.data });
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    if (await brandNameTaken(userId, parsed.data.brandName, brandProfileId)) {
      return duplicateBrandNameResponse(parsed.data.brandName);
    }

    try {
      const brandProfile = await prisma.$transaction(async (tx) => {
        // Scope the update by userId so it can only ever touch the caller's own brand.
        const updated = await tx.brandProfile.update({
          where: { id: brandProfileId, userId },
          data: parsed.data,
        });

        await linkAssets(tx, userId, updated);
        return updated;
      });

      return NextResponse.json(brandProfile);
    } catch (error) {
      if (isDuplicateBrandName(error)) return duplicateBrandNameResponse(parsed.data.brandName);
      throw error;
    }
  }

  const createError = brandProfileError({ ...seedFormData(null), ...parsed.data });
  if (createError) {
    return NextResponse.json({ error: createError }, { status: 400 });
  }

  if (await brandNameTaken(userId, parsed.data.brandName, null)) {
    return duplicateBrandNameResponse(parsed.data.brandName);
  }

  try {
    const brandProfile = await prisma.$transaction(async (tx) => {
      const created = await tx.brandProfile.create({
        data: { ...parsed.data, userId },
      });

      await linkAssets(tx, userId, created);
      return created;
    });

    return NextResponse.json(brandProfile);
  } catch (error) {
    if (isDuplicateBrandName(error)) return duplicateBrandNameResponse(parsed.data.brandName);
    throw error;
  }
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

  // Read storage paths before the cascade delete removes the BrandAsset rows that point to them.
  const assets = await prisma.brandAsset.findMany({
    where: { userId, brandProfileId },
    select: { storagePath: true },
  });

  const { count } = await prisma.brandProfile.deleteMany({
    where: { id: brandProfileId, userId },
  });

  if (count === 0) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  await Promise.all(assets.map((asset) => deleteFile(asset.storagePath).catch(() => null)));

  return NextResponse.json({ success: true });
});
