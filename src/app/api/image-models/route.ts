import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { listImageModels } from "@/lib/image-models/registry";

export const GET = withAuth(async function GET() {
  return NextResponse.json(listImageModels());
});
