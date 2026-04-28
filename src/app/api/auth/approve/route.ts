import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return new Response("Missing approval token.", { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { approvalToken: token } });

  if (!user) {
    return new Response("Approval link is invalid or has already been used.", { status: 404 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      approvedAt: user.approvedAt || new Date(),
      approvalToken: null,
    },
  });

  return new NextResponse(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>User approved</title>
  </head>
  <body style="font-family: system-ui, sans-serif; padding: 32px; line-height: 1.5;">
    <h1>User approved</h1>
    <p>${escapeHtml(user.email)} can now access PostishAI.</p>
  </body>
</html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
