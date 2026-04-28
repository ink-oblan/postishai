import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, verifyGoogleIdToken } from "@/lib/auth/google";
import { createSession } from "@/lib/auth/session";
import { notifySignupForApproval } from "@/lib/auth/telegram-approval";
import { config } from "@/lib/config";
import { prisma } from "@/lib/db";

function createApprovalToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = config.appUrl;

  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;

  // Clean up state cookie
  cookieStore.delete("oauth_state");

  if (error || !code || !state || state !== storedState) {
    const loginUrl = new URL("/login", appUrl);
    loginUrl.searchParams.set("error", "oauth_failed");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const googleUser = await verifyGoogleIdToken(tokens.id_token);

    // Check if this Google account is already linked
    const account = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "google",
          providerAccountId: googleUser.sub,
        },
      },
      include: { user: true },
    });

    let userId: string;
    let isApproved = false;

    if (account) {
      // Existing Google account — just log in
      userId = account.userId;
      isApproved = Boolean(account.user.approvedAt);
    } else {
      // Only link/create if Google has verified the email
      if (!googleUser.email_verified) {
        const loginUrl = new URL("/login", appUrl);
        loginUrl.searchParams.set("error", "email_not_verified");
        return NextResponse.redirect(loginUrl);
      }

      // Check if a user with this email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      if (existingUser) {
        // Link Google account to existing user
        await prisma.account.create({
          data: {
            userId: existingUser.id,
            provider: "google",
            providerAccountId: googleUser.sub,
          },
        });
        userId = existingUser.id;
        isApproved = Boolean(existingUser.approvedAt);
      } else {
        // Create new user with Google account
        const newUser = await prisma.user.create({
          data: {
            name: googleUser.name,
            email: googleUser.email,
            avatarUrl: googleUser.picture,
            approvalToken: createApprovalToken(),
            accounts: {
              create: {
                provider: "google",
                providerAccountId: googleUser.sub,
              },
            },
          },
        });
        await notifySignupForApproval(newUser);
        await prisma.user.update({
          where: { id: newUser.id },
          data: { approvalNotifiedAt: new Date() },
        });
        userId = newUser.id;
      }
    }

    await createSession(userId);
    if (!isApproved) {
      return NextResponse.redirect(new URL("/pending-approval", appUrl));
    }
    return NextResponse.redirect(new URL("/dashboard", appUrl));
  } catch {
    const loginUrl = new URL("/login", appUrl);
    loginUrl.searchParams.set("error", "oauth_failed");
    return NextResponse.redirect(loginUrl);
  }
}
