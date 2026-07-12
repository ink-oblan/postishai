import { broadcastWithContext } from "@/lib/broadcast-utils";

export async function broadcastWithFallback(
  context: string,
  eventName: string,
  broadcastFn: () => Promise<void>,
): Promise<void> {
  try {
    await broadcastWithContext(eventName, broadcastFn);
  } catch (broadcastErr) {
    console.error(`[${context}] Broadcast failed:`, broadcastErr);
  }
}
