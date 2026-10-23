import { defineConfig } from "vitest/config";

// Browser tests against a RUNNING site (npm run dev or npm start). See docs/TESTING.md.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/e2e/**/*.e2e.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
