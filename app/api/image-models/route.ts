import { NextResponse } from "next/server";
import { listImageModels } from "@/lib/image-models/registry";
import { withAuth } from "@/lib/auth/dal";

export const GET = withAuth(async function GET() {
  return NextResponse.json(listImageModels());
});
