import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getValidSession, SESSION_COOKIE } from "@/lib/auth/session";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/privacy",
  "/terms",
  "/about",
  "/api/auth",
  "/api/health",
  "/api/waitlist",
];
const STATIC_PATHS = ["/_next", "/favicon.ico", "/static"];

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    STATIC_PATHS.some((p) => pathname.startsWith(p))
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (isPublicPath(pathname)) {
    // If user is authenticated and on login page, redirect to dashboard
    if (pathname === "/login" && token) {
      const session = await getValidSession(token);
      if (session) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      // Cookie is present but doesn't back a live DB session (expired,
      // revoked, or from another database) — clear it so it can't keep
      // bouncing this request between /login and a protected route.
      const response = NextResponse.next();
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
    return NextResponse.next();
  }

  // Protected routes — check for a valid, DB-backed session
  const isApi = pathname.startsWith("/api/");

  if (!token) {
    if (isApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await getValidSession(token);
  if (!session) {
    const response = isApi
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
