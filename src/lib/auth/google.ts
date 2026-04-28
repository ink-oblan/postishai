import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "../config";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

const googleJWKS = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

function getRedirectUri() {
  return `${config.appUrl}/api/auth/google/callback`;
}

export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: config.google.oauthClientId,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "consent",
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.google.oauthClientId,
      client_secret: config.google.oauthClientSecret,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange code for tokens");
  }

  return response.json() as Promise<{
    access_token: string;
    id_token: string;
    refresh_token?: string;
  }>;
}

export type GoogleUser = {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
};

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleUser> {
  const { payload } = await jwtVerify(idToken, googleJWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: config.google.oauthClientId,
  });

  const { sub, email, email_verified, name, picture } = payload as Record<string, unknown>;

  if (typeof sub !== "string" || typeof email !== "string") {
    throw new Error("Invalid ID token claims");
  }

  return {
    sub,
    email,
    email_verified: email_verified === true,
    name: typeof name === "string" ? name : "",
    picture: typeof picture === "string" ? picture : "",
  };
}
