// E2E: loads the built extension (dist/extension) into real Chromium.
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  workers: 2,
  reporter: "list",
  use: { viewport: { width: 1280, height: 800 } },
});
