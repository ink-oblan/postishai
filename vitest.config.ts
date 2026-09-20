import { resolve } from "node:path";
import { defaultExclude, defineConfig } from "vitest/config";

const domTests = [
  "src/**/*.test.tsx",
  "src/app/(app)/brand/lib/__tests__/draft.test.ts",
  "src/components/design/rasterize.test.ts",
  "src/components/design/useDesignEditor.test.ts",
  "src/components/design/useEditorShortcuts.test.ts",
  "src/lib/__tests__/safe-storage.test.ts",
];

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: [...defaultExclude, ...domTests],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          include: domTests,
        },
      },
    ],
  },
});
