import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const chromium = "/opt/pw-browsers/chromium";
const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: existsSync(chromium) ? { executablePath: chromium } : {},
    serviceWorkers: "allow",
  },
  projects: [
    // The flat card layout (no WebGL), so these tests are quick and deterministic.
    {
      name: "laptop", testIgnore: /glass\.spec/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, launchOptions: { ...(existsSync(chromium) ? { executablePath: chromium } : {}), args: ["--disable-3d-apis"] } },
    },
    // The WebGL glass cabinet, on software rendering.
    {
      name: "glass",
      testMatch: /glass\.spec/,
      use: {
        ...devices["Desktop Chrome"], viewport: { width: 1000, height: 640 },
        launchOptions: { ...(existsSync(chromium) ? { executablePath: chromium } : {}), args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] },
      },
    },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    env: { SYNC_MODE: "memory", NEXT_PUBLIC_SYNC_MODE: "memory" },
    timeout: 120_000,
  },
});
