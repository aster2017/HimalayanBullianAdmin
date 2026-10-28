#!/bin/bash
# RETIRED 2026-09-18. Production: the GitLab pipeline (.gitlab-ci.yml) since 2026-10-28. VAPT: deploy-vapt.sh.
#
# What this script used to do, and why it is no longer safe to run:
#   * built the shared tag hbc-web:latest and ran `docker compose up -d --force-recreate` with no
#     service name in /opt/aster/apps/hbc, recreating every service in that stack,
#   * ran `docker image prune -f`, deleting the previous image — leaving no way back,
#   * built from the working tree, so uncommitted local files went to production.
#
# Production now deploys through the GitLab pipeline, which keeps the replaced image as
# hbc-web:previous. The original is in git history (before this commit).
set -euo pipefail

cat >&2 <<'MSG'

  deploy.sh is retired — it recreated the whole prod stack and pruned the rollback image.

    Production : push to main on GitLab (https://gitlab.manageprojects.net/hbc/web), then run the
                 pipeline's manual "deploy" job.
    VAPT       : bash deploy-vapt.sh

  The pipeline builds the pushed commit, keeps the running image as hbc-web:previous, and recreates only hbc-web.

MSG
exit 1
