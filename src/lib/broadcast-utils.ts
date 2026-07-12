export async function broadcastWithContext(
  context: string,
  broadcastFn: () => Promise<void>,
): Promise<void> {
  try {
    await broadcastFn();
  } catch (err) {
    console.error(`[${context}] Failed to broadcast:`, err);
    // Clients will reconnect on next heartbeat
  }
}
