import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "src/tests/db/**/*.test.ts",
      "src/tests/security/authenticated-tenant-api.test.ts",
    ],
    setupFiles: ["./src/tests/db/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
