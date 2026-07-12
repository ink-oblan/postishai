export async function safeDbUpdate<T>(
  updateFn: () => Promise<T>,
  context: string,
  id: string,
): Promise<T | null> {
  return updateFn().catch((dbErr) => {
    console.error(`[${context}] DB update failed for id=${id}:`, dbErr);
    return null;
  });
}
