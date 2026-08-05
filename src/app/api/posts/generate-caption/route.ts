import type { Platform } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { broadcastPostStatusUpdate } from "@/app/api/dashboard/subscribe/route";
import { withAuth } from "@/lib/auth/dal";
import { broadcastWithContext } from "@/lib/broadcast-utils";
import { validateCaptionMedia } from "@/lib/caption-media-validation";
import { METADATA_STATUS, POST_STATUS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { debugLog } from "@/lib/debug";
import { convertToJpeg } from "@/lib/image-convert";
import { writeFile } from "@/lib/storage";
import { enqueuePostMetadataGenerateJob } from "@/lib/worker/jobs";

const VIDEO_EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export const POST = withAuth(async function POST(req: NextRequest, _ctx, { userId }) {
  debugLog("[generate-caption] POST request started");
  const formData = await req.formData();
  const title = formData.get("title")?.toString();
  const platform = formData.get("platform")?.toString();
  const details = formData.get("details")?.toString();
  const llmModelId = formData.get("llmModelId")?.toString();
  const media = formData.getAll("media").filter((v): v is File => v instanceof File);

  debugLog(`[generate-caption] title=${title}, platform=${platform}, media count=${media.length}`);

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (!llmModelId) {
    return NextResponse.json({ error: "llmModelId is required" }, { status: 400 });
  }

  const mediaValidationError = validateCaptionMedia(media);
  if (mediaValidationError) {
    return NextResponse.json({ error: mediaValidationError.message }, { status: 400 });
  }

  try {
    // Create post and media records in a single transaction
    const post = await prisma.$transaction(async (tx) => {
      const createdPost = await tx.post.create({
        data: {
          type: "CAPTION",
          title: title.trim(),
          platform: (platform as Platform) || "INSTAGRAM",
          details: details?.trim() || null,
          status: POST_STATUS.GENERATING,
          metadataStatus: METADATA_STATUS.GENERATING,
          userId,
          llmModelId,
        },
      });

      await Promise.all(
        media.map((file, i) => {
          const isVideo = file.type.startsWith("video/");
          const ext = isVideo ? (VIDEO_EXTENSIONS[file.type] ?? "mp4") : "jpg";
          return tx.postMedia.create({
            data: {
              postId: createdPost.id,
              type: isVideo ? "VIDEO" : "IMAGE",
              path: `posts/${createdPost.id}/${i}.${ext}`,
              order: i,
            },
          });
        }),
      );

      return createdPost;
    });

    // Save media files to storage in parallel (after transaction succeeds)
    await Promise.all(
      media.map(async (file, i) => {
        const isVideo = file.type.startsWith("video/");
        const ext = isVideo ? (VIDEO_EXTENSIONS[file.type] ?? "mp4") : "jpg";
        const path = `posts/${post.id}/${i}.${ext}`;
        try {
          let buffer = Buffer.from(await file.arrayBuffer()) as Buffer;
          if (!isVideo) buffer = await convertToJpeg(buffer);
          debugLog(`[generate-caption] Writing to storage: ${path}`);
          await writeFile(path, buffer);
        } catch (err) {
          throw new Error(`Failed to save media ${i} (${path})`, { cause: err });
        }
      }),
    );

    await enqueuePostMetadataGenerateJob({ postId: post.id });

    // Broadcast post creation so open dashboards/lists pick it up without a refresh.
    try {
      await broadcastWithContext("post-caption-create", () =>
        broadcastPostStatusUpdate(userId, post.id, post.status),
      );
    } catch (broadcastErr) {
      console.error(
        `[POST /api/posts/generate-caption] Broadcast failed for postId=${post.id}:`,
        broadcastErr,
      );
      // Don't fail the request - post and job were created successfully
    }

    return NextResponse.json({
      postId: post.id,
      post: {
        id: post.id,
        title: post.title,
        platform: post.platform,
        metadataStatus: METADATA_STATUS.GENERATING,
        status: POST_STATUS.GENERATING,
        media: await prisma.postMedia.findMany({
          where: { postId: post.id },
          orderBy: { order: "asc" },
        }),
      },
    });
  } catch (err) {
    console.error("Caption post creation failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create post" },
      { status: 500 },
    );
  }
});
