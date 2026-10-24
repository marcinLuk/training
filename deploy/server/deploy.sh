#!/usr/bin/env bash
# Deploy one commit of the Trening app on the server.
#
# Usage: deploy.sh <40-character lowercase hex commit SHA>
# Environment:
#   TRENING_DIR   folder with compose.yaml and .env (default: /opt/trening)
#
# This is the only command the deploy key may run. It runs as root through a narrow
# sudo rule, so it trusts nothing: it accepts one argument, checks it against a strict
# pattern before it runs any command, and never executes its input.
#
# Steps:
#   1. pull the image for that SHA (the stored tag does not change if this fails)
#   2. store the SHA as TRENING_TAG in $TRENING_DIR/.env (temp file, then move)
#   3. restart the app with that tag
set -euo pipefail
export LC_ALL=C

if [ "$#" -ne 1 ]; then
  echo "deploy: expected exactly one argument: a 40-character commit SHA" >&2
  exit 2
fi
TAG="$1"
if [[ ! "$TAG" =~ ^[0-9a-f]{40}$ ]]; then
  echo "deploy: refused: the tag must be a 40-character lowercase hex commit SHA" >&2
  exit 2
fi

DIR="${TRENING_DIR:-/opt/trening}"
if [ ! -f "$DIR/compose.yaml" ]; then
  echo "deploy: no compose.yaml in ${DIR}" >&2
  exit 1
fi

compose() {
  TRENING_TAG="$TAG" docker compose --project-directory "$DIR" -f "$DIR/compose.yaml" "$@"
}

TMP=""
trap '[ -z "$TMP" ] || rm -f -- "$TMP"' EXIT

echo "deploy: pulling image tag ${TAG}"
compose pull app

echo "deploy: storing TRENING_TAG in ${DIR}/.env"
TMP="$(mktemp "$DIR/.env.XXXXXX")"
printf 'TRENING_TAG=%s\n' "$TAG" >"$TMP"
mv -f -- "$TMP" "$DIR/.env"
TMP=""

echo "deploy: restarting the app"
compose up -d app

echo "deploy: done, the app runs image tag ${TAG}"
