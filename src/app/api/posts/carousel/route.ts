import type { Platform } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { broadcastPostStatusUpdate } from "@/app/api/dashboard/subscribe/route";
import { withAuth } from "@/lib/auth/dal";
import { broadcastWithContext } from "@/lib/broadcast-utils";
import { isCarouselPlatform, slideCountError } from "@/lib/carousel/platform-spec";
import { CAROUSEL_STAGE, POST_STATUS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { debugLog } from "@/lib/debug";
import { DEFAULT_LLM_MODEL_ID, getLLMAdapter } from "@/lib/llm-models/registry";
import { enqueueCarouselScenarioJobInDb } from "@/lib/worker/jobs";

export const POST = withAuth(async function POST(req: NextRequest, _ctx: unknown, { userId }) {
  const body = await req.json();
  const { title, platform, slideCount, details, brandProfileId, llmModelId } = body as {
    title?: string;
    platform?: Platform;
    slideCount?: number;
    details?: string | null;
    brandProfileId?: string | null;
    llmModelId?: string;
  };

  const trimmedTitle = title?.trim();
  if (!trimmedTitle) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!isCarouselPlatform(platform)) {
    return NextResponse.json({ error: "A valid platform is required" }, { status: 400 });
  }

  const count = Number(slideCount);
  const countError = slideCountError(platform, count);
  if (countError) {
    return NextResponse.json({ error: countError }, { status: 400 });
  }

  const selectedLlmModelId = llmModelId?.trim() || DEFAULT_LLM_MODEL_ID;
  try {
    getLLMAdapter(selectedLlmModelId);
  } catch {
    return NextResponse.json({ error: "Unknown AI model" }, { status: 400 });
  }

  const brand = brandProfileId
    ? await prisma.brandProfile.findFirst({ where: { id: brandProfileId, userId } })
    : null;
  if (brandProfileId && !brand) {
    return NextResponse.json({ error: "Brand profile not found" }, { status: 404 });
  }

  // The plan itself is an LLM call, so the post lands first and the worker fills it in. Creating
  // and queueing together keeps a post from existing with nothing on the way to populate it.
  const post = await prisma
    .$transaction(async (tx) => {
      const created = await tx.post.create({
        data: {
          type: "CAROUSEL",
          title: trimmedTitle,
          platform,
          details: details?.trim() || null,
          status: POST_STATUS.GENERATING,
          carouselStage: CAROUSEL_STAGE.SCENARIO,
          brandProfileId: brand?.id ?? null,
          llmModelId: selectedLlmModelId,
          userId,
        },
        include: { slides: { orderBy: { order: "asc" } } },
      });

      await enqueueCarouselScenarioJobInDb(tx, { postId: created.id, slideCount: count });

      return created;
    })
    .catch((err) => {
      console.error("[POST /api/posts/carousel] Failed to queue the plan:", err);
      return null;
    });

  if (!post) {
    return NextResponse.json({ error: "Failed to plan the carousel" }, { status: 500 });
  }

  debugLog(`[POST /api/posts/carousel] created postId=${post.id} slides=${count} (queued)`);

  try {
    await broadcastWithContext("post-carousel-create", () =>
      broadcastPostStatusUpdate(userId, post.id, post.status),
    );
  } catch (broadcastErr) {
    console.error(
      `[POST /api/posts/carousel] Broadcast failed for postId=${post.id}:`,
      broadcastErr,
    );
  }

  return NextResponse.json(post, { status: 201 });
});
