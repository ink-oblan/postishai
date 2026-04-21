import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_SECRET } from "@/lib/auth/secret";

const PUBLIC_PATHS = ["/login", "/api/auth"];
const STATIC_PATHS = ["/_next", "/favicon.ico", "/logo.svg", "/logo-dark.svg"];

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    STATIC_PATHS.some((p) => pathname.startsWith(p))
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    // If user is authenticated and on login page, redirect to dashboard
    if (pathname === "/login") {
      const token = request.cookies.get("session")?.value;
      if (token) {
        try {
          await jwtVerify(token, SESSION_SECRET);
          return NextResponse.redirect(new URL("/dashboard", request.url));
        } catch {
          // Invalid token, let them see login page
        }
      }
    }
    return NextResponse.next();
  }

  // Protected routes — check for valid session cookie
  const token = request.cookies.get("session")?.value;
  const isApi = pathname.startsWith("/api/");

  if (!token) {
    if (isApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, SESSION_SECRET);
    return NextResponse.next();
  } catch {
    if (isApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
