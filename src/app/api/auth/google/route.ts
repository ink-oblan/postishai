import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/auth/google";
import { config } from "@/lib/config";

export async function GET() {
  const state = crypto.randomUUID();

  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  const url = getGoogleAuthUrl(state);
  return NextResponse.redirect(url);
}
