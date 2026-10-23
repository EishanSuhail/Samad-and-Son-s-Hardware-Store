import { defineConfig } from "vitest/config";
import path from "node:path";

const TEST_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:5432/samad_hardware_test";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "tests/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    // Integration tests share one database, so run test files one at a time.
    fileParallelism: false,
    env: {
      DATABASE_URL: TEST_URL,
      AUTH_SECRET: "test-secret-test-secret-test-secret-123456",
    },
  },
});
