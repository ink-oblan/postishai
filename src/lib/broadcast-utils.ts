import { isMockEnabled } from "./mock-config";

export async function broadcastWithContext(
  context: string,
  broadcastFn: () => Promise<void>,
): Promise<void> {
  // In mock mode, add delay to ensure file is fully written before broadcast
  if (isMockEnabled()) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  try {
    await broadcastFn();
  } catch (err) {
    console.error(`[${context}] Failed to broadcast:`, err);
    // Clients will reconnect on next heartbeat
  }
}
