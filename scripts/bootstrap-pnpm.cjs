#!/usr/bin/env node
/**
 * Bootstrap pnpm before workspace install.
 *
 * This monorepo uses pnpm-only protocols (`workspace:*`, `catalog:`) which
 * npm cannot resolve. When the user runs `npm install`, this preinstall step:
 *   1. Lets npm install the small set of root devDependencies (concurrently,
 *      typescript, prettier).
 *   2. Ensures pnpm is available so the `postinstall` hook can run
 *      `pnpm install` to install every workspace package correctly.
 *
 * If invoked under pnpm itself, this script does nothing.
 */
const { execSync, spawnSync } = require("node:child_process");

const ua = process.env.npm_config_user_agent || "";

if (ua.startsWith("pnpm/")) {
  process.exit(0);
}

try {
  execSync("pnpm --version", { stdio: "ignore" });
  process.exit(0);
} catch {
  // pnpm not on PATH — install it globally via npm.
}

console.log("[bootstrap] Installing pnpm globally so workspace deps can resolve...");
const result = spawnSync("npm", ["install", "-g", "pnpm@9"], {
  stdio: "inherit",
});

if (result.status !== 0) {
  console.error(
    "[bootstrap] Failed to install pnpm globally. " +
      "Please install it manually: npm install -g pnpm@9",
  );
  process.exit(result.status ?? 1);
}
