import { config } from "../config";

let encodedSecret: Uint8Array | undefined;

export function getSessionSecret() {
  if (encodedSecret) return encodedSecret;

  const raw = config.sessionSecret;

  if (raw.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters long.");
  }

  encodedSecret = new TextEncoder().encode(raw);
  return encodedSecret;
}
