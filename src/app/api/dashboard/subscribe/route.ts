import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/dal";
import { fetchDashboardData } from "@/lib/dashboard-utils";
import { prisma } from "@/lib/db";

interface ClientConnection {
  controller: ReadableStreamController<Uint8Array>;
  heartbeat: NodeJS.Timeout;
}

// In-memory store of connected clients per user
// In production, use Redis or similar for multi-instance deployments
const userSubscribers = new Map<string, Set<ClientConnection>>();

function sendEventToUser(userId: string, event: string, data: unknown) {
  const subscribers = userSubscribers.get(userId);
  if (!subscribers || subscribers.size === 0) {
    console.log(`[subscribe] No subscribers for userId=${userId}`);
    return;
  }

  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message);

  const toRemove: ClientConnection[] = [];
  for (const conn of subscribers) {
    try {
      conn.controller.enqueue(encoded);
    } catch {
      toRemove.push(conn);
    }
  }

  for (const conn of toRemove) {
    clearInterval(conn.heartbeat);
    subscribers.delete(conn);
  }
}

export async function broadcastPostStatusUpdate(userId: string, postId: string, status: string) {
  // Fetch fresh dashboard data to include in the update
  const freshData = await fetchDashboardData(userId);
  console.log(`[broadcast] Sending post-status-update for postId=${postId}, status=${status}`);
  sendEventToUser(userId, "post-status-update", {
    postId,
    status,
    stats: freshData,
  });
}

export const GET = withAuth(async function GET(_req: NextRequest, _ctx, { userId }) {
  // Create SSE response
  let clientConnection: ClientConnection | null = null;

  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Register this client
      if (!userSubscribers.has(userId)) {
        userSubscribers.set(userId, new Set());
      }

      const encoder = new TextEncoder();
      console.log(`[subscribe] Client connected for userId=${userId}`);

      // Send initial data with current stats
      const currentStats = await prisma.post.groupBy({
        by: ["status"],
        where: { userId, archivedAt: null },
        _count: true,
      });

      const byStatus = Object.fromEntries(currentStats.map((s) => [s.status, s._count]));
      const generatingCount = byStatus.GENERATING ?? 0;

      const initialData = `event: init\ndata: ${JSON.stringify({ generatingCount })}\n\n`;
      controller.enqueue(encoder.encode(initialData));

      // Refresh stats every 5 seconds to catch updates from other processes
      let lastGeneratingCount = generatingCount;

      const statsRefresh = setInterval(async () => {
        try {
          const updated = await prisma.post.groupBy({
            by: ["status"],
            where: { userId, archivedAt: null },
            _count: true,
          });

          const updatedByStatus = Object.fromEntries(updated.map((s) => [s.status, s._count]));
          const updatedGeneratingCount = updatedByStatus.GENERATING ?? 0;
          const updatedCompletedCount = updatedByStatus.COMPLETED ?? 0;
          const updatedPostCount = Object.values(updatedByStatus).reduce(
            (a, b) => a + (b as number),
            0,
          );

          // Send stats-refresh if any count changed
          if (updatedGeneratingCount !== lastGeneratingCount) {
            lastGeneratingCount = updatedGeneratingCount;
            const statsData = `event: stats-refresh\ndata: ${JSON.stringify({
              generatingCount: updatedGeneratingCount,
              completedCount: updatedCompletedCount,
              postCount: updatedPostCount,
            })}\n\n`;
            try {
              controller.enqueue(encoder.encode(statsData));
            } catch {
              // Controller is closed (client disconnected), stop sending
              clearInterval(statsRefresh);
              clearInterval(heartbeat);
              return;
            }
          }
        } catch (err) {
          console.error("Failed to refresh stats:", err);
        }
      }, 5000);

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(":heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
          clearInterval(statsRefresh);
        }
      }, 10000);

      clientConnection = { controller, heartbeat };
      userSubscribers.get(userId)?.add(clientConnection);
    },
    cancel() {
      // Clean up this specific client connection
      if (clientConnection) {
        const subscribers = userSubscribers.get(userId);
        if (subscribers) {
          clearInterval(clientConnection.heartbeat);
          subscribers.delete(clientConnection);
          console.log(
            `[subscribe] Client disconnected for userId=${userId}, ${subscribers.size} subscriber(s) remaining`,
          );
        }
      }
    },
  });

  return new NextResponse(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
