#!/usr/bin/env bash
# Smoke test for the Trening Docker image (D4).
#
# Usage: bash scripts/smoke-image.sh [IMAGE_TAG] [--no-build]
#   IMAGE_TAG    image to build and test (default: trening:smoke)
#   --no-build   test an image that already exists; do not build it
# Environment:
#   SMOKE_PORT   host port on 127.0.0.1 (default: 4197)
#
# The container runs with the same hardening as deploy/compose.yaml. Every check
# prints one line. The script runs all checks, then exits 1 if any check failed.
# The container is always removed, also when a check or a step fails.
set -euo pipefail

IMAGE="trening:smoke"
BUILD=1
IMAGE_SET=0
for arg in "$@"; do
  case "$arg" in
    --no-build) BUILD=0 ;;
    -*) echo "smoke: unknown option: $arg" >&2; exit 2 ;;
    *)
      if [ "$IMAGE_SET" -eq 1 ]; then
        echo "smoke: more than one image tag given" >&2
        exit 2
      fi
      IMAGE="$arg"
      IMAGE_SET=1
      ;;
  esac
done

PORT="${SMOKE_PORT:-4197}"
case "$PORT" in
  '' | *[!0-9]*) echo "smoke: SMOKE_PORT must be a number, got: $PORT" >&2; exit 2 ;;
esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME="trening-smoke-$$-${RANDOM}"
BASE="http://127.0.0.1:${PORT}"
HTML_ROOT="/usr/share/nginx/html"
FAILED=0
CHECKS=0

cleanup() {
  local status=$?
  trap - EXIT
  if [ -n "$(docker ps -aq --filter "name=^${NAME}\$")" ]; then
    if ! docker rm -f "$NAME" >/dev/null; then
      echo "smoke: could not remove container ${NAME}" >&2
      [ "$status" -eq 0 ] && status=1
    fi
  fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

pass() {
  CHECKS=$((CHECKS + 1))
  echo "ok    $1"
}

fail() {
  CHECKS=$((CHECKS + 1))
  FAILED=$((FAILED + 1))
  echo "FAIL  $1" >&2
}

# check_eq <label> <actual> <expected>
check_eq() {
  if [ "$2" = "$3" ]; then
    pass "$1 = '$3'"
  else
    fail "$1: expected '$3', got '$2'"
  fi
}

# Print the raw response headers of a GET (CR removed). Exit non-zero on a curl error.
fetch_headers() {
  local url="$1"
  shift
  curl --silent --show-error --max-time 10 --dump-header - --output /dev/null "$@" "$url" | tr -d '\r'
}

# header_of <headers> <name>: the exact value of the first header with that name.
header_of() {
  printf '%s\n' "$1" | awk -v want="$(printf '%s' "$2" | tr 'A-Z' 'a-z')" '
    { i = index($0, ":"); if (i == 0) next
      name = tolower(substr($0, 1, i - 1))
      if (name == want) { v = substr($0, i + 1); sub(/^[ \t]+/, "", v); sub(/[ \t]+$/, "", v); print v; exit } }'
}

status_of() {
  printf '%s\n' "$1" | awk 'NR == 1 { print $2; exit }'
}

# check_response <path> <status> <content-type[|alt...]> <cache-control> [extra header checks "Name=value" ...]
check_response() {
  local path="$1" want_status="$2" want_type="$3" want_cache="$4"
  shift 4
  local headers
  if ! headers="$(fetch_headers "${BASE}${path}")"; then
    fail "${path}: request failed"
    return
  fi
  check_eq "${path} status" "$(status_of "$headers")" "$want_status"
  if [ -n "$want_type" ]; then
    local actual_type
    actual_type="$(header_of "$headers" Content-Type)"
    # want_type may list alternatives separated by '|' (both JavaScript types are valid).
    case "|${want_type}|" in
      *"|${actual_type}|"*) pass "${path} Content-Type = '${actual_type}'" ;;
      *) fail "${path} Content-Type: expected '${want_type}', got '${actual_type}'" ;;
    esac
  fi
  [ -z "$want_cache" ] || check_eq "${path} Cache-Control" "$(header_of "$headers" Cache-Control)" "$want_cache"
  local pair
  for pair in "$@"; do
    check_eq "${path} ${pair%%=*}" "$(header_of "$headers" "${pair%%=*}")" "${pair#*=}"
  done
}

# Names of files inside the image, so the script never guesses a hashed name.
first_file_in_image() {
  # first_file_in_image <glob inside HTML_ROOT>
  local found
  found="$(docker exec "$NAME" sh -c "ls -1 ${HTML_ROOT}/$1 2>/dev/null | head -n 1")"
  if [ -z "$found" ]; then
    echo "smoke: no file matches ${HTML_ROOT}/$1 in the image" >&2
    return 1
  fi
  basename "$found"
}

if [ "$BUILD" -eq 1 ]; then
  echo "smoke: building ${IMAGE}"
  docker build --tag "$IMAGE" "$ROOT"
fi
if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "smoke: image ${IMAGE} does not exist" >&2
  exit 1
fi

echo "smoke: starting ${NAME} from ${IMAGE} on 127.0.0.1:${PORT}"
docker run --detach --name "$NAME" \
  --publish "127.0.0.1:${PORT}:8080" \
  --read-only --tmpfs /tmp \
  --cap-drop ALL --security-opt no-new-privileges:true \
  "$IMAGE" >/dev/null

# Wait until nginx answers. Stop early when the container has exited.
ready=0
for _ in $(seq 1 30); do
  if [ "$(docker inspect --format '{{.State.Running}}' "$NAME")" != "true" ]; then
    echo "smoke: container exited before it answered. Log follows." >&2
    docker logs "$NAME" >&2 || true
    exit 1
  fi
  if curl --silent --fail --max-time 2 --output /dev/null "${BASE}/"; then
    ready=1
    break
  fi
  sleep 1
done
if [ "$ready" -ne 1 ]; then
  echo "smoke: no answer from ${BASE}/ after 30 seconds. Log follows." >&2
  docker logs "$NAME" >&2 || true
  exit 1
fi

SEC=(
  "X-Robots-Tag=noindex, nofollow"
  "X-Content-Type-Options=nosniff"
  "Referrer-Policy=no-referrer"
  "Content-Security-Policy=default-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
  "Permissions-Policy=screen-wake-lock=(self), camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=()"
  "Strict-Transport-Security=max-age=31536000"
)
# nginx 1.31 maps .js to application/javascript. Browsers accept both JavaScript types.
JS_TYPES="application/javascript|text/javascript"
IMMUTABLE="public, max-age=31536000, immutable"

# Shell and update-control files: revalidate. Security headers on every response.
check_response "/" 200 "text/html" "no-cache" "${SEC[@]}"
check_response "/index.html" 200 "text/html" "no-cache" "${SEC[@]}"
check_response "/sw.js" 200 "$JS_TYPES" "no-cache" "${SEC[@]}"
check_response "/manifest.webmanifest" 200 "application/manifest+json" "no-cache" "${SEC[@]}"

# Hashed files: cache for a year. Security headers repeat in these locations too.
asset="$(first_file_in_image 'assets/*.js')"
check_response "/assets/${asset}" 200 "$JS_TYPES" "$IMMUTABLE" "${SEC[@]}"
workbox="$(first_file_in_image 'workbox-*.js')"
check_response "/${workbox}" 200 "$JS_TYPES" "$IMMUTABLE" "${SEC[@]}"

# Files without a hash: revalidate.
font="$(first_file_in_image 'fonts/*.woff2')"
check_response "/fonts/${font}" 200 "font/woff2" "no-cache" "${SEC[@]}"
check_response "/icons/pwa-192x192.png" 200 "image/png" "no-cache" "${SEC[@]}"
check_response "/favicon.svg" 200 "image/svg+xml" "no-cache" "${SEC[@]}"

# A missing file is a real 404, not index.html. The headers still apply.
check_response "/does-not-exist.js" 404 "" "" "${SEC[@]}"
check_response "/assets/does-not-exist.js" 404 "" "" "${SEC[@]}"

# Server header: the name only, no version.
if headers="$(fetch_headers "${BASE}/")"; then
  check_eq "Server header" "$(header_of "$headers" Server)" "nginx"
else
  fail "Server header: request failed"
fi

# Text types are compressed.
if headers="$(fetch_headers "${BASE}/assets/${asset}" --header 'Accept-Encoding: gzip')"; then
  check_eq "/assets/${asset} Content-Encoding (gzip requested)" "$(header_of "$headers" Content-Encoding)" "gzip"
else
  fail "gzip check: request failed"
fi

# Not root: the image's configured user, and every nginx process in the container.
image_user="$(docker image inspect --format '{{.Config.User}}' "$IMAGE")"
case "$image_user" in
  '' | 0 | root | 0:* | root:*) fail "image user is root or unset: '${image_user}'" ;;
  *) pass "image user is '${image_user}' (not root)" ;;
esac
if procs="$(docker exec "$NAME" ps -o user= -o comm=)"; then
  nginx_users="$(printf '%s\n' "$procs" | awk '$2 == "nginx" { print $1 }' | sort -u)"
  if [ -z "$nginx_users" ]; then
    fail "no nginx process found in the container"
  elif [ "$nginx_users" = "root" ] || printf '%s\n' "$nginx_users" | grep -qx 'root'; then
    fail "an nginx process runs as root"
  else
    pass "nginx processes run as '$(printf '%s' "$nginx_users" | tr '\n' ' ' | sed 's/ $//')' (not root)"
  fi
else
  fail "could not list processes in the container"
fi
check_eq "container uid" "$(docker exec "$NAME" id -u)" "101"

echo "smoke: ${CHECKS} checks, ${FAILED} failed"
if [ "$FAILED" -ne 0 ]; then
  exit 1
fi
echo "smoke: all checks passed"
