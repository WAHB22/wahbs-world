import withSerwistInit from "@serwist/next";
import { spawnSync } from "node:child_process";
import type { NextConfig } from "next";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() || String(Date.now());

// The service worker is built by webpack (`next build --webpack`); dev stays on Turbopack without it.
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: ["/", "/today", "/settings", "/login", "/~offline"].map((url) => ({ url, revision })),
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

export default withSerwist(nextConfig);
