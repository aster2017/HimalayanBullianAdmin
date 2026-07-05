#!/bin/bash
set -e

# ─── CONFIG ───────────────────────────────────────────────
IMAGE="hbc-web-vapt"
SERVER_USER="ubuntu"
SERVER_IP="45.117.153.20"
APP_DIR="/opt/aster/apps/hbc-vapt"
SSH_KEY="$HOME/.ssh/aster_deploy"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=no"
# ──────────────────────────────────────────────────────────

echo ""
echo "======================================"
echo "  HBC Web VAPT → hbc.manageprojects.net"
echo "======================================"
echo ""

echo "[1/3] Building Docker image (VAPT API endpoint)..."
docker build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL=https://hbcapi.manageprojects.net/api \
  --build-arg NEXT_PUBLIC_ENV=production \
  -t "$IMAGE:latest" \
  "$SCRIPT_DIR"
echo "      Build complete."

echo "[2/3] Transferring image to server..."
docker save "$IMAGE:latest" | gzip | $SSH "$SERVER_USER@$SERVER_IP" "gunzip | docker load"
echo "      Transfer complete."

echo "[3/3] Restarting container on server..."
$SSH "$SERVER_USER@$SERVER_IP" bash << EOF
  cd $APP_DIR
  docker compose up -d --force-recreate hbc-web-vapt
  docker image prune -f
  echo "Container status:"
  docker ps --filter name=hbc-web-vapt --format "  {{.Names}} | {{.Status}}"
EOF

echo ""
echo "======================================"
echo "  Done! https://hbc.manageprojects.net"
echo "======================================"
