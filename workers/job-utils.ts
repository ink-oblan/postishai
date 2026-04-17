export function parseObjectPayload(rawPayload: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawPayload);
  } catch {
    throw new Error("Invalid job payload JSON");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid job payload shape");
  }

  return parsed as Record<string, unknown>;
}

export function readRequiredString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid job payload: ${key} is required`);
  }
  return value;
}

export function isRetryableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (
    normalized.includes("fetch failed") ||
    normalized.includes("timed out") ||
    normalized.includes("aborted") ||
    normalized.includes("deadline exceeded") ||
    normalized.includes("service unavailable") ||
    normalized.includes("currently experiencing high demand") ||
    normalized.includes("unavailable") ||
    normalized.includes("rate limit") ||
    normalized.includes("\"status\":\"unavailable\"") ||
    normalized.includes("\"status\":\"deadline_exceeded\"") ||
    normalized.includes("\"status\":\"resource_exhausted\"") ||
    normalized.includes("\"code\":429") ||
    normalized.includes("\"code\":500") ||
    normalized.includes("\"code\":502") ||
    normalized.includes("\"code\":503") ||
    normalized.includes("\"code\":504")
  ) {
    return true;
  }

  return false;
}
