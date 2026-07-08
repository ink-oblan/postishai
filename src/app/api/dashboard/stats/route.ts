import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { fetchDashboardData } from "@/lib/dashboard-utils";

export const GET = withAuth(async function GET(_req: NextRequest, _ctx, { userId }) {
  const data = await fetchDashboardData(userId);
  return NextResponse.json(data);
});
