function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

function withDefault(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const config = {
  get nodeEnv() {
    return process.env.NODE_ENV ?? "production";
  },
  get isProduction() {
    return this.nodeEnv === "production";
  },
  get isDevelopment() {
    return this.nodeEnv === "development";
  },

  get appUrl() {
    return withDefault("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  },
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get storagePath() {
    return withDefault("STORAGE_PATH", "storage");
  },

  get sessionSecret() {
    return required("SESSION_SECRET");
  },

  google: {
    get apiKey() {
      return required("GOOGLE_API_KEY");
    },
    get oauthClientId() {
      return required("GOOGLE_OAUTH_CLIENT_ID");
    },
    get oauthClientSecret() {
      return required("GOOGLE_OAUTH_CLIENT_SECRET");
    },
  },

  heygen: {
    get apiKey() {
      return required("HEYGEN_API_KEY");
    },
  },

  telegram: {
    get botToken() {
      return optional("TELEGRAM_BOT_TOKEN");
    },
    get approvalChatId() {
      return optional("TELEGRAM_APPROVAL_CHAT_ID");
    },
  },
};
