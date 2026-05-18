#!/usr/bin/env bash
# ── Moonshadows — Renace Protocol deploy.sh ──────────────────
#  Usage on VPS:
#      cd /opt/moonshadows && ./moonshadows-web/deploy.sh
#  First run: clones the repo into PROJECT_DIR, then deploys.

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/ExpertosTI/Moonshadows.git}"
PROJECT_DIR="${PROJECT_DIR:-/opt/moonshadows}"
STACK_NAME="${STACK_NAME:-moonshadows}"
SERVICE_NAME="${STACK_NAME}_web"
DOMAIN="${DOMAIN:-moonshadowspro.com}"
COMPOSE_DIR_REL="${COMPOSE_DIR_REL:-.}"

cyan()  { printf "\033[36m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
red()   { printf "\033[31m%s\033[0m\n" "$*" >&2; }

cyan "── 1. Sync source ──────────────────────────────"
if [ -d "$PROJECT_DIR/.git" ]; then
  cd "$PROJECT_DIR"
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  cyan "Current branch detected: $CURRENT_BRANCH"
  git fetch origin "$CURRENT_BRANCH"
  git reset --hard "origin/$CURRENT_BRANCH"
else
  git clone "$REPO_URL" "$PROJECT_DIR"
  cd "$PROJECT_DIR"
fi

COMPOSE_DIR="$PROJECT_DIR/$COMPOSE_DIR_REL"
cd "$COMPOSE_DIR"

cyan "── 2. Build image locally ──────────────────────"
docker compose build

cyan "── 3. Ensure RenaceNet exists ──────────────────"
if ! docker network ls --format '{{.Name}}' | grep -qx "RenaceNet"; then
  docker network create --driver overlay --attachable RenaceNet
fi

cyan "── 4. Deploy stack ($STACK_NAME → $DOMAIN) ─────"
export DOMAIN
docker stack deploy -c docker-compose.yml "$STACK_NAME"

cyan "── 5. Force service to pick up new local image ─"
docker service update --force "$SERVICE_NAME" >/dev/null 2>&1 || true

cyan "── 6. Cleanup dangling images ──────────────────"
docker image prune -f >/dev/null

green ""
green "✅ Moonshadows deployed."
green "   Site:    https://$DOMAIN"
green "   Service: $SERVICE_NAME"
green "   Logs:    docker service logs -f $SERVICE_NAME"
