const raw = process.env.SESSION_SECRET;

if (!raw) {
  throw new Error(
    "SESSION_SECRET environment variable is required. Generate one with: openssl rand -base64 32"
  );
}

if (raw.length < 32) {
  throw new Error(
    "SESSION_SECRET must be at least 32 characters long."
  );
}

export const SESSION_SECRET = new TextEncoder().encode(raw);
