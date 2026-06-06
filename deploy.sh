#!/bin/bash
set -e

# ─── CONFIG ───────────────────────────────────────────────
IMAGE="hbc-web"
SERVER_USER="ubuntu"
SERVER_IP="45.117.153.20"
APP_DIR="/opt/aster/apps/hbc"
SSH_KEY="$HOME/.ssh/aster_deploy"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=no"
# ──────────────────────────────────────────────────────────

echo ""
echo "======================================"
echo "  HBC Web Deploy → hbc.semis.app"
echo "======================================"
echo ""

# Step 1: Build for linux/amd64
echo "[1/3] Building Docker image..."
docker build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL=https://hbcapi.semis.app/api \
  --build-arg NEXT_PUBLIC_ENV=production \
  -t "$IMAGE:latest" \
  "$SCRIPT_DIR"
echo "      Build complete."

# Step 2: Transfer to server
echo "[2/3] Transferring image to server..."
docker save "$IMAGE:latest" | gzip | $SSH "$SERVER_USER@$SERVER_IP" "gunzip | docker load"
echo "      Transfer complete."

# Step 3: Restart on server
echo "[3/3] Deploying on server..."
$SSH "$SERVER_USER@$SERVER_IP" bash << EOF
  cd $APP_DIR
  docker compose up -d --force-recreate
  docker image prune -f
  echo "Container status:"
  docker ps --filter name=hbc-web --format "  {{.Names}} | {{.Status}}"
EOF

echo ""
echo "======================================"
echo "  Done! https://hbc.semis.app"
echo "======================================"
