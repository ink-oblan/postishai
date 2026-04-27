let encodedSecret: Uint8Array | undefined;

export function getSessionSecret() {
  if (encodedSecret) return encodedSecret;

  const raw = process.env.SESSION_SECRET;

  if (!raw) {
    throw new Error(
      "SESSION_SECRET environment variable is required. Generate one with: openssl rand -base64 32",
    );
  }

  if (raw.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters long.");
  }

  encodedSecret = new TextEncoder().encode(raw);
  return encodedSecret;
}
