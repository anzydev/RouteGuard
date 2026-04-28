# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Project: Transit

A neo-brutalist supply chain disruption control tower (single-page React + Vite app at `/`).

### Architecture

- **`artifacts/api-server`** — Express 5 + Drizzle + Postgres. All routes under `/api`. Lib modules in `src/lib/`: `network.ts` (Dijkstra k-shortest), `scenarios.ts` (6 disruption scenarios), `risk.ts` (severity-weighted scoring + status derivation + lat/lng interpolation), `recommendations.ts` (3 reroutes per shipment), `ai.ts` (OpenAI gpt-5-mini for briefing + command interpretation, with template fallback), `seed.ts` (35 hubs, 45 lanes, 220 shipments), `state.ts` (in-memory rec cache).
- **`artifacts/transit`** — React + Vite + Tailwind v4 + shadcn UI, react-simple-maps@3 for the world map, framer-motion for transitions, wouter routing. Live tick every 4s invalidates summary/shipments/disruptions/events queries.

### Key API Routes

- `GET /api/summary` — KPIs + scoreboard
- `GET /api/shipments` (filters: status, mode, limit) and `GET /api/shipments/:id` (returns shipment + 3 recommendations + timeline)
- `POST /api/shipments/:id/accept-reroute` — apply a recommendation, bumps scoreboard
- `POST /api/disruptions/simulate` body `{scenario}` — one of `suez_blocked | china_export_freeze | eu_port_strike | global_weather_chaos | la_port_congestion | panama_drought`
- `POST /api/disruptions/reset` — clears all sims, restores baseline (returns `{cleared}`)
- `GET /api/disruptions`, `GET /api/events`, `GET /api/hubs`, `GET /api/lanes`
- `POST /api/briefing` — AI mission briefing
- `POST /api/command` — natural-language command interpretation
- `POST /api/scoreboard/reset`

### Codegen Notes

- After running `pnpm --filter @workspace/api-spec run codegen`, **manually drop** the `export * from "./generated/types";` line in `lib/api-zod/src/index.ts` (orval re-creates it but it conflicts with `./generated/api` zod schemas of the same names).

### AI

- Uses OpenAI via Replit AI Integrations (`AI_INTEGRATIONS_OPENAI_BASE_URL` + `AI_INTEGRATIONS_OPENAI_API_KEY`). Model: `gpt-5-mini` with `response_format: json_object`. Falls back to deterministic templates if the API call fails.

### Theming

- Two themes: **dark** ("Midnight Ops" — deep navy bg, neon lime/violet/coral accents) and **light** ("Daylight Ops" — warm cream bg, dark brutalist borders, deeper olive primary).
- Defined as CSS variables in `src/index.css` under `:root, .dark { ... }` and `html.light, :root.light, .light { ... }`. `html.light` selectors are required to win against `:root` specificity.
- `src/hooks/use-theme.tsx` — `<ThemeProvider>` + `useTheme()` hook. Persists to `localStorage["transit-theme"]`, defaults to dark, supports `?theme=dark|light` URL override for deep-linking demos.
- `src/components/ThemeToggle.tsx` — animated sun/moon button. Mounted in `KpiStrip` (top-left brand block).
- `Map.tsx` reads `useTheme()` and swaps a `PALETTE` of fill/stroke colors for landmasses, lanes, hubs, shipments, disruptions.
- **Important:** Do NOT add `className="dark"` (or `light`) anywhere in the React tree. CSS variables cascade; a hardcoded class on a wrapper div re-defines variables for its subtree and breaks the toggle.

### Local development

- Run `./start.sh` for one-shot setup: prereq check → auto-create `.env` from `.env.example` → DB precheck → `npm install` → `db:push` → port auto-shift → launches API (`8080`) + Web (`5173`) via `concurrently`.
- Or `npm run dev` after a manual `npm install` (root `package.json` has a `preinstall` hook that bootstraps pnpm via `scripts/bootstrap-pnpm.cjs`).
