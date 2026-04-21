import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";

export const GET = withAuth(async function GET(_req, _ctx, session) {
  const { user } = session;
  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
  });
});
