import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { config } from "../config";
import { getSessionSecret } from "./secret";

export const SESSION_COOKIE = "session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(userId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const session = await prisma.session.create({
    data: { userId, expiresAt },
  });

  const token = await new SignJWT({ sessionId: session.id, userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresAt)
    .sign(getSessionSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function verifySessionToken(
  token: string,
): Promise<{ sessionId: string; userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    return payload as { sessionId: string; userId: string };
  } catch {
    return null;
  }
}

/**
 * Verifies the JWT *and* that a matching, unexpired Session row still exists.
 * This is the source of truth for session validity — a cryptographically
 * valid but DB-orphaned token (e.g. session deleted/expired, or a cookie
 * left over from a different database) must be treated as logged out here,
 * not just where the JWT is checked.
 */
export async function getValidSession(token: string) {
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return { userId: session.userId, user: session.user };
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    const payload = await verifySessionToken(token);
    if (payload) {
      await prisma.session.delete({ where: { id: payload.sessionId } }).catch(() => {});
    }
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}
