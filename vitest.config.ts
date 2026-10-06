import { defineConfig } from "vitest/config";

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify("test"), __ENGINE_BUILD__: JSON.stringify("2.1.19") },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "engine",
          environment: "node",
          include: ["src/engine/**/*.test.ts", "src/data/**/*.test.ts", "scripts/**/*.test.ts"],
          exclude: ["src/engine/__oracle__/**"],
          env: { TZ: process.env.TZ ?? "America/Denver" },
          setupFiles: ["src/test/matchers.ts"],
          testTimeout: 30000,
        },
      },
      {
        extends: true,
        test: {
          name: "oracle",
          environment: "node",
          include: ["src/engine/__oracle__/**/*.test.ts"],
          testTimeout: 60000,
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["src/test/setup.ts"],
          globals: true,
        },
      },
    ],
  },
});
