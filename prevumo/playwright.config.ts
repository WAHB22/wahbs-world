import { defineConfig } from "@playwright/test";

// Builds the static site, serves it, and runs the scripted demo path at 1440x900 and on a phone.
// In a container with its own Chromium, point PW_CHROMIUM at it.
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  use: {
    baseURL: "http://localhost:5181",
    launchOptions: { executablePath: process.env.PW_CHROMIUM || undefined },
  },
  projects: [
    { name: "laptop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "phone", use: { viewport: { width: 390, height: 844 }, hasTouch: true } },
  ],
  webServer: {
    command: "npm run build && npx vite preview --port 5181 --strictPort",
    url: "http://localhost:5181",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
