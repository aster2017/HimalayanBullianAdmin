#!/bin/bash
# RETIRED 2026-10-28. Production deploys go through the GitLab pipeline (.gitlab-ci.yml); VAPT: deploy-vapt.sh.
#
# This script built a pushed commit and pinned the production compose file to hbc-web:prod-<stamp>.
# Production now runs hbc-web:latest from the pipeline, which keeps the same guarantees (it builds
# the pushed commit, keeps a rollback image, recreates only hbc-web). Re-pinning the compose file
# would make every later pipeline deploy refuse until it points at hbc-web:latest again.
# The original is in git history (before this commit).
set -euo pipefail

cat >&2 <<'MSG'

  deploy-prod-safe.sh is retired — production deploys go through the GitLab pipeline.

    Production : push to main on GitLab (https://gitlab.manageprojects.net/hbc/web), then run the
                 pipeline's manual "deploy" job. It builds the pushed commit, keeps the running image
                 as hbc-web:previous, and checks the site and the running commit afterwards.
                 Rollback on the server: docker tag hbc-web:previous hbc-web:latest, then
                 docker compose up -d --force-recreate in /opt/aster/apps/hbc.
    VAPT       : bash deploy-vapt.sh

MSG
exit 1
