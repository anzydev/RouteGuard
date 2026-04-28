#!/usr/bin/env node
/**
 * Run a workspace-wide pnpm install only when the user started with npm.
 * This avoids recursive postinstall loops in pnpm/Vercel environments.
 */
const { spawnSync } = require("node:child_process");

const ua = process.env.npm_config_user_agent || "";

if (ua.startsWith("pnpm/")) {
  process.exit(0);
}

console.log("[postinstall] Installing workspace dependencies with pnpm...");
const result = spawnSync("pnpm", ["install", "--no-frozen-lockfile"], {
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
