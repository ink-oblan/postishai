import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    include: { avatar: true },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(post);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.status !== "DRAFT") {
    return NextResponse.json({ error: "Only DRAFT posts can be edited" }, { status: 409 });
  }
  const body = await req.json();
  const { title, script, voiceId, archive } = body as { title?: string; script?: string; voiceId?: string; archive?: boolean };

  if (archive) {
    await prisma.post.update({ where: { id }, data: { archivedAt: new Date() } });
    return new NextResponse(null, { status: 204 });
  }

  const updated = await prisma.post.update({
    where: { id },
    data: { title, script, voiceId },
  });
  return NextResponse.json(updated);
}

