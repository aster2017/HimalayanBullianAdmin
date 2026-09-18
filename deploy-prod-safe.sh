#!/bin/bash
# Deploy the React admin to PRODUCTION ONLY (hbc.semis.app), safely.
#
# Why not deploy.sh: it builds from the working tree, retags hbc-web:latest, runs
# `docker compose up` for the whole prod web stack and `docker image prune -f` (no rollback). This script:
#   * builds from an exact `git archive` of a PUSHED commit,
#   * tags hbc-web:prod-<stamp>, points ONLY the prod compose's hbc-web service at it,
#   * tags the running image hbc-web:prod-rollback-<stamp>, recreates only hbc-web, never prunes.
#
# Usage:  bash deploy-prod-safe.sh [commit]            (default: HEAD)
#         DRY_RUN=1 bash deploy-prod-safe.sh [commit]  (checks only)
set -euo pipefail

IMAGE="hbc-web"
STAMP="$(date +%Y%m%d-%H%M)"
TAG="prod-$STAMP"
SERVER_USER="ubuntu"
SERVER_IP="45.117.153.20"
PROD_DIR="/opt/aster/apps/hbc"
SERVICE="hbc-web"
API_URL="https://hbcapi.semis.app/api"
SITE_URL="https://hbc.semis.app/"
SSH_KEY="$HOME/.ssh/aster_deploy"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SSH="ssh -i $SSH_KEY -o BatchMode=yes -o ConnectTimeout=15"
COMMIT_REF="${1:-HEAD}"
DRY_RUN="${DRY_RUN:-0}"

cd "$SCRIPT_DIR"
COMMIT="$(git rev-parse --verify "$COMMIT_REF^{commit}")"
SHORT="$(git rev-parse --short "$COMMIT")"

echo ""
echo "======================================"
echo "  HBC Admin Deploy → PRODUCTION ONLY"
echo "  hbc.semis.app  (API: $API_URL)"
echo "======================================"
echo "  Commit : $SHORT $(git log -1 --format=%s "$COMMIT" | cut -c1-90)"
echo "  Tag    : $IMAGE:$TAG"
[ "$DRY_RUN" = "1" ] && echo "  Mode   : DRY RUN (no build, no deploy)"

git fetch -q origin
[ -n "$(git branch -r --contains "$COMMIT")" ] || { echo "ABORT: $SHORT is not on any origin branch — push it first." >&2; exit 1; }
docker version --format "{{.Server.Version}}" >/dev/null 2>&1 || { echo "ABORT: Docker is not running." >&2; exit 1; }

echo ""
echo "  Remote preflight (read-only) ..."
$SSH "$SERVER_USER@$SERVER_IP" PROD_DIR="$PROD_DIR" SERVICE="$SERVICE" bash -s <<'CHECK'
set -euo pipefail
cd "$PROD_DIR"
[ -w docker-compose.yml ] || { echo "ABORT: compose not writable by $(whoami)." >&2; exit 1; }
MATCHES="$(grep -cE '^[[:space:]]+image:[[:space:]]+hbc-web:' docker-compose.yml || true)"
[ "$MATCHES" = "1" ] || { echo "ABORT: expected exactly one 'image: hbc-web:' line, found $MATCHES." >&2; exit 1; }
docker ps --filter "name=^${SERVICE}$" --format '    running: {{.Names}} | {{.Image}} | {{.Status}}'
echo "    compose writable, one hbc-web image line: OK"
CHECK

if [ "$DRY_RUN" = "1" ]; then echo ""; echo "  DRY RUN complete — nothing built or deployed."; exit 0; fi

echo ""
read -r -p "  Type PRODUCTION to deploy $SHORT to hbc.semis.app: " answer
[ "$answer" = "PRODUCTION" ] || { echo "Cancelled."; exit 0; }

echo ""
echo "[1/3] Building $IMAGE:$TAG from $SHORT (production API URL) ..."
BUILD_CTX="$(mktemp -d)"
trap 'rm -rf "$BUILD_CTX"' EXIT
git archive "$COMMIT" | tar -x -C "$BUILD_CTX"
docker build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL="$API_URL" \
  --build-arg NEXT_PUBLIC_ENV=production \
  --label "hbc.commit=$COMMIT" \
  -t "$IMAGE:$TAG" "$BUILD_CTX"

echo ""
echo "[2/3] Transferring $IMAGE:$TAG ..."
docker save "$IMAGE:$TAG" | gzip | $SSH "$SERVER_USER@$SERVER_IP" "gunzip | docker load"

echo ""
echo "[3/3] Recreating $SERVICE (production) only ..."
$SSH "$SERVER_USER@$SERVER_IP" IMAGE="$IMAGE" TAG="$TAG" STAMP="$STAMP" PROD_DIR="$PROD_DIR" SERVICE="$SERVICE" SITE_URL="$SITE_URL" bash -s <<'REMOTE'
set -euo pipefail
cd "$PROD_DIR"
CURRENT_ID="$(docker inspect --format '{{.Image}}' "$SERVICE")"
docker tag "$CURRENT_ID" "$IMAGE:prod-rollback-$STAMP"
echo "  Rollback image tagged: $IMAGE:prod-rollback-$STAMP"
cp docker-compose.yml "docker-compose.yml.bak.$STAMP"
sed -i -E "s#^([[:space:]]+image:[[:space:]]+)hbc-web:.*#\1$IMAGE:$TAG#" docker-compose.yml
grep -nE '^[[:space:]]+image:' docker-compose.yml | sed 's/^/  /'
docker compose config --quiet
docker compose up -d --force-recreate --no-deps "$SERVICE"
sleep 20
docker ps --filter "name=^${SERVICE}$" --format '  {{.Names}} | {{.Image}} | {{.Status}}'
echo "  restarts: $(docker inspect --format '{{.RestartCount}}' "$SERVICE")"
echo "  site: HTTP $(curl -s -o /dev/null -w '%{http_code}' -L --max-time 20 "$SITE_URL")"
echo ""
echo "  ROLLBACK:"
echo "    cd $PROD_DIR && cp docker-compose.yml.bak.$STAMP docker-compose.yml \\"
echo "      && docker compose up -d --force-recreate --no-deps $SERVICE"
REMOTE

echo ""
echo "  Done. Only production hbc-web changed; VAPT and old images untouched."
