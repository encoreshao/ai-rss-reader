#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  deploy.sh — build & deploy to production
#
#  Usage:
#    npm run deploy          → build frontend + sync dist + restart PM2
#    npm run deploy:full     → also sync source files + npm install on server
#    npm run restart         → restart PM2 only (no build/sync)
#
#  Config: scripts/deploy.config (gitignored)
# ─────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/deploy.config"

# ── helpers ──────────────────────────────────────────────
step()  { echo ""; echo "▸ $*"; }
ok()    { echo "  ✓ $*"; }
fail()  { echo "  ✗ $*" >&2; exit 1; }

# ── load config ──────────────────────────────────────────
if [[ ! -f "$CONFIG_FILE" ]]; then
  fail "Missing config file: scripts/deploy.config
  Copy scripts/deploy.config.example → scripts/deploy.config and fill in your values."
fi
# shellcheck source=deploy.config
source "$CONFIG_FILE"

MODE="frontend"
if [[ "${1:-}" == "--full" ]];    then MODE="full";    fi
if [[ "${1:-}" == "--restart" ]]; then MODE="restart"; fi

# ── restart only ─────────────────────────────────────────
if [[ "$MODE" == "restart" ]]; then
  step "Restarting PM2 process on server…"
  ssh "$SERVER" "pm2 restart $APP_NAME && pm2 status"
  ok "Server restarted"
  echo ""
  echo "  Live at $SITE_URL"
  exit 0
fi

# ── build ─────────────────────────────────────────────────
step "Building frontend…"
npm run build
ok "Build complete ($(du -sh dist | cut -f1) in dist/)"

# ── sync dist ─────────────────────────────────────────────
step "Syncing dist/ to server…"
rsync -az --delete \
  --exclude='.DS_Store' \
  dist/ \
  "$SERVER:$APP_DIR/dist/"
ok "dist/ synced"

# ── full: sync source + npm install ───────────────────────
if [[ "$MODE" == "full" ]]; then
  step "Syncing source files to server…"
  rsync -az --delete \
    --exclude='.git' \
    --exclude='.DS_Store' \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='*.db' \
    ./ \
    "$SERVER:$APP_DIR/"
  ok "Source files synced"

  step "Installing dependencies on server…"
  ssh "$SERVER" "cd $APP_DIR && npm install --omit=dev 2>&1 | tail -3"
  ok "npm install complete"
fi

# ── restart PM2 ───────────────────────────────────────────
step "Restarting server…"
ssh "$SERVER" "pm2 restart $APP_NAME --update-env" 2>/dev/null || \
  ssh "$SERVER" "pm2 restart $APP_NAME"
ok "PM2 restarted"

# ── verify (retry up to 15s for server to boot) ───────────
step "Verifying deployment…"
HTTP_STATUS="000"
for i in 1 2 3 4 5; do
  sleep 3
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL")
  [[ "$HTTP_STATUS" == "200" ]] && break
done
if [[ "$HTTP_STATUS" == "200" ]]; then
  ok "Site is live — HTTP $HTTP_STATUS"
else
  fail "Site returned HTTP $HTTP_STATUS after restart (check: ssh $SERVER 'pm2 logs $APP_NAME --lines 20')"
fi

echo ""
echo "  Deployed to $SITE_URL"
echo ""
