import { runWorker } from "./workers/index";

runWorker().catch((error) => {
  console.error(`[${new Date().toISOString()}] [worker] fatal startup error:`, error);
  process.exit(1);
});
