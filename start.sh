#!/usr/bin/env bash
# =============================================================================
# Transit — zero-friction launcher
# =============================================================================
# Just run:    ./start.sh
#
# This script auto-detects what's missing, fixes what it can, and explains the
# rest. Safe to re-run any time.
# =============================================================================

set -uo pipefail

cd "$(dirname "$0")"
ROOT_DIR="$(pwd)"

# --- pretty output ---------------------------------------------------------
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  C_RESET=$'\033[0m'
  C_BOLD=$'\033[1m'
  C_DIM=$'\033[2m'
  C_RED=$'\033[31m'
  C_GREEN=$'\033[32m'
  C_YELLOW=$'\033[33m'
  C_BLUE=$'\033[34m'
  C_MAGENTA=$'\033[35m'
  C_CYAN=$'\033[36m'
else
  C_RESET=""; C_BOLD=""; C_DIM=""; C_RED=""; C_GREEN=""; C_YELLOW=""; C_BLUE=""; C_MAGENTA=""; C_CYAN=""
fi

step()    { printf "\n${C_BOLD}${C_CYAN}==>${C_RESET} ${C_BOLD}%s${C_RESET}\n" "$*"; }
ok()      { printf "    ${C_GREEN}✓${C_RESET} %s\n" "$*"; }
info()    { printf "    ${C_DIM}%s${C_RESET}\n" "$*"; }
warn()    { printf "    ${C_YELLOW}!${C_RESET} %s\n" "$*"; }
fail()    { printf "    ${C_RED}✗${C_RESET} %s\n" "$*" >&2; }
fatal()   { fail "$1"; [ -n "${2:-}" ] && printf "      ${C_DIM}%s${C_RESET}\n" "$2" >&2; exit 1; }

banner() {
  printf "\n"
  printf "${C_BOLD}${C_YELLOW} ████████ ██████   █████  ███    ██ ███████ ██ ████████${C_RESET}\n"
  printf "${C_BOLD}${C_YELLOW}    ██    ██   ██ ██   ██ ████   ██ ██      ██    ██   ${C_RESET}\n"
  printf "${C_BOLD}${C_YELLOW}    ██    ██████  ███████ ██ ██  ██ ███████ ██    ██   ${C_RESET}\n"
  printf "${C_BOLD}${C_YELLOW}    ██    ██   ██ ██   ██ ██  ██ ██      ██ ██    ██   ${C_RESET}\n"
  printf "${C_BOLD}${C_YELLOW}    ██    ██   ██ ██   ██ ██   ████ ███████ ██    ██   ${C_RESET}\n"
  printf "${C_BOLD}${C_MAGENTA}                  T R A N S I T${C_RESET}\n\n"
  printf "${C_DIM}    Supply chain disruption control tower — local launcher${C_RESET}\n"
}

cleanup() {
  local code=$?
  if [ $code -ne 0 ]; then
    printf "\n${C_RED}${C_BOLD}Startup aborted${C_RESET} ${C_DIM}(exit $code)${C_RESET}\n"
    printf "${C_DIM}Re-run ./start.sh after fixing the issue above.${C_RESET}\n\n"
  fi
}
trap cleanup EXIT

banner

# ---------------------------------------------------------------------------
# 1. Check prerequisites
# ---------------------------------------------------------------------------
step "Checking prerequisites"

have() { command -v "$1" >/dev/null 2>&1; }

if ! have node; then
  fatal "Node.js is not installed." \
        "Install Node.js 20+ from https://nodejs.org/  then re-run ./start.sh"
fi
NODE_VERSION="$(node -v)"
NODE_MAJOR="${NODE_VERSION#v}"; NODE_MAJOR="${NODE_MAJOR%%.*}"
if [ "$NODE_MAJOR" -lt 20 ]; then
  fatal "Node.js $NODE_VERSION is too old (need 20+)." \
        "Upgrade from https://nodejs.org/  then re-run ./start.sh"
fi
ok "Node $NODE_VERSION"

if ! have npm; then
  fatal "npm is not installed (it usually ships with Node.js)."
fi
ok "npm $(npm -v)"

if ! have bash; then
  fatal "bash is required."
fi

# ---------------------------------------------------------------------------
# 2. Make sure .env exists
# ---------------------------------------------------------------------------
step "Checking environment configuration"

if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp ".env.example" ".env"
    ok "Created .env from .env.example"
    warn "Open .env and set DATABASE_URL before continuing."
    info "Default points at: postgres://postgres:postgres@localhost:5432/transit"
  else
    fatal ".env.example is missing. Cannot bootstrap configuration."
  fi
else
  ok ".env present"
fi

# Load .env so the rest of the script can see DATABASE_URL etc.
set -a
# shellcheck disable=SC1091
. ./.env
set +a

DEMO_MODE=0

if [ -z "${DATABASE_URL:-}" ]; then
  warn "DATABASE_URL is empty — starting in demo memory mode."
  DEMO_MODE=1
else
  ok "DATABASE_URL configured"
fi

export SESSION_SECRET="${SESSION_SECRET:-dev-secret-change-me}"
if [ "$SESSION_SECRET" = "dev-secret-change-me" ]; then
  info "Using default SESSION_SECRET (fine for local dev)"
fi

if [ -z "${AI_INTEGRATIONS_OPENAI_API_KEY:-}" ]; then
  info "OpenAI key not set — AI features will use template fallback (still functional)"
else
  ok "OpenAI integration configured"
fi

# ---------------------------------------------------------------------------
# 3. Verify Postgres is reachable
# ---------------------------------------------------------------------------
step "Verifying database connection"

node - <<'NODEJS' 2>/dev/null
const url = process.env.DATABASE_URL;
if (!url) process.exit(2);
import("pg").then(async ({ default: pg }) => {
  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
    await client.query("SELECT 1");
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}).catch(() => process.exit(3));
NODEJS
DB_CHECK=$?

case "$DB_CHECK" in
  0) ok "Database is reachable" ;;
  2)
    info "No DATABASE_URL set — will run without Postgres"
    DEMO_MODE=1
    ;;
  3) info "Skipping precheck — pg module not installed yet (will check after install)" ;;
  *)
    warn "Could not connect to the database at \$DATABASE_URL"
    info "Falling back to demo memory mode for local startup"
    DEMO_MODE=1
    ;;
esac

# ---------------------------------------------------------------------------
# 4. Install dependencies
# ---------------------------------------------------------------------------
step "Installing dependencies"

NEEDS_INSTALL=0
if [ ! -d "node_modules" ]; then
  NEEDS_INSTALL=1
  info "node_modules missing — fresh install"
elif [ "package.json" -nt "node_modules/.package-lock.json" ] 2>/dev/null; then
  NEEDS_INSTALL=1
  info "package.json changed — re-installing"
fi

if [ "$NEEDS_INSTALL" -eq 1 ]; then
  if ! npm install --no-audit --no-fund; then
    fatal "npm install failed. See errors above."
  fi
  ok "Dependencies installed"
else
  ok "Dependencies up to date"
fi

# Re-check DB now that pg is definitely installed.
if [ "$DB_CHECK" = "3" ] && [ "$DEMO_MODE" -eq 0 ]; then
  step "Re-verifying database connection"
  if node - <<'NODEJS' 2>/dev/null
import("pg").then(async ({ default: pg }) => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  try { await client.connect(); await client.query("SELECT 1"); await client.end(); process.exit(0); }
  catch (err) { console.error(err.message); process.exit(1); }
}).catch(() => process.exit(3));
NODEJS
  then
    ok "Database is reachable"
  else
    warn "Could not connect to the database at \$DATABASE_URL"
    info "Falling back to demo memory mode for local startup"
    DEMO_MODE=1
  fi
fi

# ---------------------------------------------------------------------------
# 5. Push DB schema
# ---------------------------------------------------------------------------
if [ "$DEMO_MODE" -eq 1 ]; then
  step "Skipping database schema push"
  export TRANSIT_STORAGE="memory"
  info "Demo memory mode enabled"
else
  step "Pushing database schema"
  if ! npm run db:push --silent; then
    fatal "Schema push failed. See errors above."
  fi
  ok "Schema is up to date"
fi

# ---------------------------------------------------------------------------
# 6. Choose ports (auto-shift if taken)
# ---------------------------------------------------------------------------
step "Reserving ports"

port_free() {
  ! (echo > "/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1
}
pick_port() {
  local p=$1
  while ! port_free "$p"; do
    p=$((p + 1))
  done
  echo "$p"
}

API_PORT="$(pick_port 8080)"
WEB_PORT="$(pick_port 5173)"
export PORT_API="$API_PORT"
export PORT_WEB="$WEB_PORT"
export API_PROXY_TARGET="http://localhost:$API_PORT"

ok "API  → port $API_PORT"
ok "Web  → port $WEB_PORT"

# ---------------------------------------------------------------------------
# 7. Launch
# ---------------------------------------------------------------------------
step "Launching Transit"
printf "\n"
printf "    ${C_BOLD}${C_GREEN}▸ Web app:${C_RESET}   ${C_BOLD}http://localhost:%s${C_RESET}\n" "$WEB_PORT"
printf "    ${C_BOLD}${C_GREEN}▸ API:${C_RESET}       http://localhost:%s/api/summary\n" "$API_PORT"
if [ "${TRANSIT_STORAGE:-}" = "memory" ]; then
  printf "    ${C_BOLD}${C_GREEN}▸ Mode:${C_RESET}      ${C_BOLD}demo memory${C_RESET}\n"
fi
printf "\n"
printf "    ${C_DIM}Press Ctrl+C to stop both servers.${C_RESET}\n\n"

# Disable trap so a normal Ctrl+C exit doesn't print the error banner.
trap - EXIT

PORT="$API_PORT" \
PORT_WEB="$WEB_PORT" \
API_PROXY_TARGET="$API_PROXY_TARGET" \
TRANSIT_STORAGE="${TRANSIT_STORAGE:-}" \
exec npx --no-install concurrently \
  --kill-others-on-fail \
  --names "api,web" \
  --prefix-colors "yellow,cyan" \
  "PORT=$API_PORT pnpm --filter @workspace/api-server run dev" \
  "PORT=$WEB_PORT BASE_PATH=/ API_PROXY_TARGET=$API_PROXY_TARGET pnpm --filter @workspace/transit run dev"
