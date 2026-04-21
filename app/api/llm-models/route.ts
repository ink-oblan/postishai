import { NextResponse } from "next/server";
import { listLLMModels } from "@/lib/llm-models/registry";
import { withAuth } from "@/lib/auth/dal";

export const GET = withAuth(async function GET() {
  return NextResponse.json(listLLMModels());
});
