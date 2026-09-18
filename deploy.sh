#!/bin/bash
# RETIRED 2026-09-18. Use deploy-prod-safe.sh (production) or deploy-vapt.sh (VAPT) instead.
#
# What this script used to do, and why it is no longer safe to run:
#   * built the shared tag hbc-web:latest and ran `docker compose up -d --force-recreate` with no
#     service name in /opt/aster/apps/hbc, recreating every service in that stack,
#   * ran `docker image prune -f`, deleting the previous image — leaving no way back,
#   * built from the working tree, so uncommitted local files went to production.
#
# Production now runs pinned, per-release tags (hbc-web:prod-<stamp>) and keeps a
# hbc-web:prod-rollback-<stamp> image. The original is in git history (before this commit).
set -euo pipefail

cat >&2 <<'MSG'

  deploy.sh is retired — it recreated the whole prod stack and pruned the rollback image.

    Production : bash deploy-prod-safe.sh [commit]   (DRY_RUN=1 first for read-only preflight)
    VAPT       : bash deploy-vapt.sh

  deploy-prod-safe.sh builds from a pushed commit, tags a rollback image, and recreates only hbc-web.

MSG
exit 1
