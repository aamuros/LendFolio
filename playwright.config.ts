import { defineConfig } from "@playwright/test";
import { PERF_CONFIG } from "./perf.config";

const PERF_OUTPUT_DIR = ".perf";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.perf.spec.ts",
  timeout: PERF_CONFIG.timeoutMs,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: `${PERF_OUTPUT_DIR}/playwright-results.json` }],
  ],
  use: {
    baseURL: PERF_CONFIG.baseUrl,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [
    {
      name: "perf-chromium",
      use: {
        browserName: "chromium",
        launchOptions: {
          args: [
            "--disable-extensions",
            "--disable-background-networking",
            "--no-sandbox",
          ],
        },
      },
    },
  ],
});
