import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SESSION_SECRET } from "./secret";
const SESSION_COOKIE = "session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(userId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const session = await prisma.session.create({
    data: { userId, expiresAt },
  });

  const token = await new SignJWT({ sessionId: session.id, userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresAt)
    .sign(SESSION_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function verifySessionToken(
  token: string
): Promise<{ sessionId: string; userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return payload as { sessionId: string; userId: string };
  } catch {
    return null;
  }
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
