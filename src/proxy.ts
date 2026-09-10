import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getValidSession, SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

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
    // /login is the one place the cookie has to be checked against the database: it is
    // where a request lands after the DAL rejects a session, so trusting the JWT alone
    // would bounce the user straight back to a protected route and loop.
    if (pathname === "/login" && token) {
      if (await getValidSession(token)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      // The cookie doesn't back a live session (expired, revoked, or from another
      // database) — clear it so the loop can't restart on the next navigation.
      const response = NextResponse.next();
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
    return NextResponse.next();
  }

  // Protected routes — optimistic check only. Proxy runs on every request, so it verifies
  // the JWT signature and nothing else; `verifySession` in the DAL is what actually
  // authorizes each page and route handler against the database.
  const isApi = pathname.startsWith("/api/");

  if (!token) {
    if (isApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!(await verifySessionToken(token))) {
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
