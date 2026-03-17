import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src/test",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:8080",
  },
});
