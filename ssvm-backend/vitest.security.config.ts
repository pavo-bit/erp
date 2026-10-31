import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/tests/security/csrf-setup.ts", "./src/tests/security/retention.setup.ts"],
    include: ["src/tests/security/*.test.ts"],
    testTimeout: 10000,
  },
});
