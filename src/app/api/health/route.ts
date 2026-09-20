import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MOCK_MODE } from "@/lib/mock-config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        ok: true,
        service: "app",
        mockMode: MOCK_MODE,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: "app",
        mockMode: MOCK_MODE,
        error: error instanceof Error ? error.message : String(error),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
