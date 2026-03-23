import { NextResponse } from "next/server";
import { listLLMModels } from "@/lib/llm-models/registry";

export async function GET() {
  return NextResponse.json(listLLMModels());
}
