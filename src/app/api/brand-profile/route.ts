import type { BrandProfile } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/dal";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await verifySession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, brandProfileId, brandName, mission, targetAudience, topic, ...rest } = body;

    console.log("[brand-profile POST] Received data for user:", userId);
    console.log("[brand-profile POST] logoPath:", rest.logoPath);
    console.log("[brand-profile POST] patterns:", rest.patterns);

    // Validate required fields
    if (!brandName || !targetAudience || !topic) {
      return NextResponse.json(
        { error: "Missing required fields: brandName, targetAudience, topic" },
        { status: 400 },
      );
    }

    // Verify user owns this profile
    if (userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let brandProfile: BrandProfile;

    if (brandProfileId) {
      // Update existing brand
      const existingBrand = await prisma.brandProfile.findUnique({
        where: { id: brandProfileId },
      });

      if (!existingBrand || existingBrand.userId !== userId) {
        return NextResponse.json({ error: "Brand not found or forbidden" }, { status: 403 });
      }

      brandProfile = await prisma.brandProfile.update({
        where: { id: brandProfileId },
        data: {
          brandName,
          mission,
          targetAudience,
          topic,
          ...rest,
        },
      });
    } else {
      // Create new brand
      brandProfile = await prisma.brandProfile.create({
        data: {
          userId,
          brandName,
          mission,
          targetAudience,
          topic,
          ...rest,
        },
      });
    }

    return NextResponse.json(brandProfile);
  } catch (error) {
    console.error("Error saving brand profile:", error);
    return NextResponse.json({ error: "Failed to save brand profile" }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  const session = await verifySession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { brandProfiles: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user.brandProfiles);
  } catch (error) {
    console.error("Error fetching brand profile:", error);
    return NextResponse.json({ error: "Failed to fetch brand profile" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await verifySession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const brandProfileId = searchParams.get("id");

    if (!brandProfileId) {
      return NextResponse.json({ error: "Missing brandProfileId parameter" }, { status: 400 });
    }

    const brandProfile = await prisma.brandProfile.findUnique({
      where: { id: brandProfileId },
    });

    if (!brandProfile) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    if (brandProfile.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.brandProfile.delete({
      where: { id: brandProfileId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting brand profile:", error);
    return NextResponse.json({ error: "Failed to delete brand profile" }, { status: 500 });
  }
}
