import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cache } from "react";
import { Role } from "@prisma/client";
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

export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
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

type RouteHandler<TContext> = (
  request: NextRequest,
  context: TContext,
  session: AuthSession,
) => Response | Promise<Response>;

function makeAuthWrapper<TContext>(roleCheck?: (role: Role) => boolean) {
  return (handler: RouteHandler<TContext>) =>
    async (request: NextRequest, context: TContext): Promise<Response> => {
      const session = await verifySession();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!session.user.approvedAt) {
        return NextResponse.json({ error: "Approval required" }, { status: 403 });
      }
      if (roleCheck && !roleCheck(session.user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
        if (err instanceof ForbiddenError) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        if (err instanceof SyntaxError) {
          return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }
        if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2025") {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        throw err;
      }
    };
}

/** Any authenticated + approved user. */
export function withAuth<TContext = unknown>(handler: RouteHandler<TContext>) {
  return makeAuthWrapper<TContext>()(handler);
}

/** ADMIN or SUPER_ADMIN only. */
export function withAdminAuth<TContext = unknown>(handler: RouteHandler<TContext>) {
  return makeAuthWrapper<TContext>(
    (role) => role === Role.ADMIN || role === Role.SUPER_ADMIN,
  )(handler);
}

/** SUPER_ADMIN only. */
export function withSuperAdminAuth<TContext = unknown>(handler: RouteHandler<TContext>) {
  return makeAuthWrapper<TContext>((role) => role === Role.SUPER_ADMIN)(handler);
}
