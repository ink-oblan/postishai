import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { getSessionCookie, verifySessionToken } from "./session";

export class AuthError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "AuthError";
  }
}

export class ApprovalRequiredError extends Error {
  constructor() {
    super("Approval required");
    this.name = "ApprovalRequiredError";
  }
}

export const verifySession = cache(async () => {
  const token = await getSessionCookie();
  if (!token) return null;

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
});

export async function requireSession() {
  const session = await verifySession();
  if (!session) {
    throw new AuthError();
  }
  if (!session.user.approvedAt) {
    throw new ApprovalRequiredError();
  }
  return session;
}

export type AuthSession = NonNullable<Awaited<ReturnType<typeof verifySession>>>;

/**
 * Wraps an API route handler with session verification and passes the
 * authenticated session as the final handler argument.
 */
export function withAuth<TContext = unknown>(
  handler: (
    request: NextRequest,
    context: TContext,
    session: AuthSession,
  ) => Response | Promise<Response>,
) {
  return async (request: NextRequest, context: TContext): Promise<Response> => {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!session.user.approvedAt) {
      return NextResponse.json({ error: "Approval required" }, { status: 403 });
    }

    try {
      return await handler(request, context, session);
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (err instanceof ApprovalRequiredError) {
        return NextResponse.json({ error: "Approval required" }, { status: 403 });
      }
      throw err;
    }
  };
}
