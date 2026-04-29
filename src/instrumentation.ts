export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { assertStorageModeInitialized } = await import("./lib/platform-config");
  await assertStorageModeInitialized();
}
