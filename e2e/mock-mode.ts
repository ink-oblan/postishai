import type { APIRequestContext } from "@playwright/test";

/** Refuse to run model-driving E2E specs against paid, slow production adapters by accident. */
export async function assertMockMode(request: APIRequestContext) {
  const response = await request.get("/api/health");
  const { mockMode } = (await response.json()) as { mockMode?: boolean };
  if (mockMode === true) return;

  if (process.env.E2E_REAL === "1") {
    console.warn(
      "[e2e] E2E_REAL=1 — running against real models. This spends real money and takes minutes.",
    );
    return;
  }

  throw new Error(
    "[e2e] the stack is not running with MOCK_MODE=true — refusing to run carousel specs.\n" +
      "Set MOCK_MODE=true in .env and restart the app and worker, then try again.\n" +
      "To run against real models on purpose: npm run test:e2e:real",
  );
}
