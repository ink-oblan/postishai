import { NextResponse } from "next/server";
import { listImageModels } from "@/lib/image-models/registry";

export async function GET() {
  return NextResponse.json(listImageModels());
}
