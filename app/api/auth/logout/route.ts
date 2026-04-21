import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth/session";

export async function POST() {
  await deleteSession();
  return NextResponse.json({ ok: true });
}
