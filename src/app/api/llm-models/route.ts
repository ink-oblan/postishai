import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { listLLMModels } from "@/lib/llm-models/registry";

export const GET = withAuth(async function GET() {
  return NextResponse.json(listLLMModels());
});
