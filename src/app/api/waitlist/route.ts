import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isValidWaitlistEmail, normalizeWaitlistEmail } from "@/lib/waitlist";

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email =
    typeof body === "object" && body !== null && "email" in body
      ? (body as { email: unknown }).email
      : undefined;

  if (typeof email !== "string" || !isValidWaitlistEmail(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const normalized = normalizeWaitlistEmail(email);

  try {
    await prisma.waitlistEntry.create({ data: { email: normalized } });
    return NextResponse.json({ ok: true, alreadyRegistered: false });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ ok: true, alreadyRegistered: true });
    }
    throw err;
  }
}
