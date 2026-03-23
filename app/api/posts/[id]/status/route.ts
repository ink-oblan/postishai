import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVideoStatus, downloadVideo } from "@/lib/heygen/client";
import { writeFile } from "@/lib/storage";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // If not actively generating, return current state
  if (post.status !== "GENERATING" || !post.heygenVideoId) {
    return NextResponse.json({ status: post.status, videoPath: post.videoPath });
  }

  const data = await getVideoStatus(post.heygenVideoId);

  if (data.status === "completed" && data.video_url) {
    const videoBuffer = await downloadVideo(data.video_url);
    const videoPath = `videos/${id}.mp4`;
    await writeFile(videoPath, videoBuffer);

    await prisma.post.update({
      where: { id },
      data: {
        status: "COMPLETED",
        videoPath,
        heygenVideoUrl: data.video_url,
        errorMessage: null,
      },
    });

    return NextResponse.json({ status: "COMPLETED", videoPath });
  }

  if (data.status === "failed") {
    await prisma.post.update({
      where: { id },
      data: { status: "FAILED", errorMessage: data.error ?? "Generation failed" },
    });
    return NextResponse.json({ status: "FAILED", errorMessage: data.error });
  }

  // Still processing
  return NextResponse.json({ status: "GENERATING" });
}
