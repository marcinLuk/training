#!/usr/bin/env bash
# Tests for deploy/server/deploy.sh, run against a stub `docker` on PATH.
#
# Usage: bash deploy/server/deploy.test.sh
# Environment:
#   DEPLOY_SH   script to test (default: deploy.sh next to this file). Lets a mutant
#               copy of deploy.sh be checked.
#
# Prints one line per case and exits 1 if any case failed. The stub logs one line per
# call: its arguments, the TRENING_TAG it saw, its working directory and the content
# of the stored .env at that moment. Nothing outside a temp dir is touched.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_SH="${DEPLOY_SH:-$HERE/deploy.sh}"
WORK="$(mktemp -d)"
trap 'rm -rf -- "$WORK"' EXIT

GOOD="0123456789abcdef0123456789abcdef01234567"
OLD="ffffffffffffffffffffffffffffffffffffffff"
BIN="$WORK/bin"
LOG="$WORK/docker.log"
CANARY="$WORK/canary"
mkdir -p "$BIN"

# The stub answers `docker compose ... pull|up`. STUB_FAIL_PULL=1 makes `pull` fail.
cat >"$BIN/docker" <<'STUB'
#!/usr/bin/env bash
env_now="(none)"
[ ! -f "$STUB_ENV_FILE" ] || env_now="$(cat "$STUB_ENV_FILE")"
args=""
for a in "$@"; do args="${args}[${a}]"; done
printf 'CALL args=%s tag=%s cwd=%s env=%s\n' "$args" "${TRENING_TAG-unset}" "$PWD" "$env_now" >>"$STUB_LOG"
if [ "${STUB_FAIL_PULL:-0}" = "1" ]; then
  for a in "$@"; do
    if [ "$a" = "pull" ]; then echo "stub: pull failed" >&2; exit 1; fi
  done
fi
exit 0
STUB
chmod +x "$BIN/docker"

FAILED=0
CASES=0
ok() { CASES=$((CASES + 1)); echo "ok    $1"; }
bad() { CASES=$((CASES + 1)); FAILED=$((FAILED + 1)); echo "FAIL  $1: $2"; }

# new_app <dir>: a scratch app folder with an old stored tag; empties the call log.
new_app() {
  mkdir -p "$1"
  : >"$1/compose.yaml"
  printf 'TRENING_TAG=%s\n' "$OLD" >"$1/.env"
  : >"$LOG"
  rm -f -- "$CANARY"
}

# run_deploy <app dir> [args...]: sets RC. The script runs from an unrelated folder.
run_deploy() {
  local dir="$1"
  shift
  (
    cd "$WORK" || exit 99
    PATH="$BIN:$PATH" TRENING_DIR="$dir" STUB_LOG="$LOG" STUB_ENV_FILE="$dir/.env" \
      bash "$DEPLOY_SH" "$@"
  ) >"$WORK/out.txt" 2>&1
  RC=$?
}

stored_tag() { sed -n 's/^TRENING_TAG=//p' "$1/.env"; }
call_count() { grep -c '^CALL ' "$LOG" || true; }

# Case: a valid SHA pulls first, then stores the tag, then restarts.
APP="$WORK/app"
new_app "$APP"
run_deploy "$APP" "$GOOD"
name="valid SHA: pull, then store tag, then up"
if [ "$RC" -ne 0 ]; then
  bad "$name" "exit code $RC"
else
  mapfile -t calls <"$LOG"
  if [ "${#calls[@]}" -ne 2 ]; then
    bad "$name" "expected 2 docker calls, got ${#calls[@]}"
  elif [[ "${calls[0]}" != *"[pull][app]"* ]]; then
    bad "$name" "first call is not 'pull app': ${calls[0]}"
  elif [[ "${calls[1]}" != *"[up][-d][app]"* ]]; then
    bad "$name" "second call is not 'up -d app': ${calls[1]}"
  elif [ "$(stored_tag "$APP")" != "$GOOD" ]; then
    bad "$name" "stored tag is '$(stored_tag "$APP")'"
  else
    ok "$name"
  fi
fi

name="valid SHA: the pull sees the new tag and the OLD stored tag, up sees the new tag"
if [[ "${calls[0]:-}" == *"tag=$GOOD "* && "${calls[0]:-}" == *"env=TRENING_TAG=$OLD" \
   && "${calls[1]:-}" == *"tag=$GOOD "* && "${calls[1]:-}" == *"env=TRENING_TAG=$GOOD" ]]; then
  ok "$name"
else
  bad "$name" "calls were: ${calls[*]:-none}"
fi

name="valid SHA: compose gets the app directory and its compose.yaml"
if [[ "${calls[0]:-}" == *"[--project-directory][$APP][-f][$APP/compose.yaml]"* \
   && "${calls[1]:-}" == *"[--project-directory][$APP][-f][$APP/compose.yaml]"* ]]; then
  ok "$name"
else
  bad "$name" "calls were: ${calls[*]:-none}"
fi

name="valid SHA: no temp file is left in the app directory"
left="$(find "$APP" -mindepth 1 -maxdepth 1 ! -name compose.yaml ! -name .env | wc -l)"
if [ "$left" -eq 0 ]; then ok "$name"; else bad "$name" "$left extra file(s)"; fi

# Case: a directory with a space. An unquoted variable breaks here.
SPACED="$WORK/app with space"
new_app "$SPACED"
run_deploy "$SPACED" "$GOOD"
name="directory with a space in its name"
if [ "$RC" -eq 0 ] && [ "$(call_count)" -eq 2 ] && [ "$(stored_tag "$SPACED")" = "$GOOD" ] \
   && grep -qF "[--project-directory][$SPACED][-f][$SPACED/compose.yaml]" "$LOG"; then
  ok "$name"
else
  bad "$name" "exit $RC, calls $(call_count), tag '$(stored_tag "$SPACED")'"
fi

# Cases: refused input. Non-zero exit, no docker call, stored tag unchanged.
expect_refused() {
  local label="$1"
  shift
  new_app "$APP"
  run_deploy "$APP" "$@"
  if [ "$RC" -eq 0 ]; then
    bad "$label" "exit code 0, expected non-zero"
  elif [ "$(call_count)" -ne 0 ]; then
    bad "$label" "docker was called $(call_count) time(s)"
  elif [ "$(stored_tag "$APP")" != "$OLD" ]; then
    bad "$label" "stored tag changed to '$(stored_tag "$APP")'"
  elif [ -e "$CANARY" ]; then
    bad "$label" "the input was executed"
  else
    ok "$label"
  fi
}

expect_refused "refused: no argument"
expect_refused "refused: empty argument" ""
expect_refused "refused: latest" "latest"
expect_refused "refused: uppercase SHA" "0123456789ABCDEF0123456789ABCDEF01234567"
expect_refused "refused: short SHA" "0123456789abcdef"
expect_refused "refused: 41 characters" "${GOOD}0"
expect_refused "refused: non-hex letter" "g123456789abcdef0123456789abcdef01234567"
expect_refused "refused: SHA followed by '; rm -rf /'" "$GOOD; rm -rf /"
expect_refused "refused: SHA followed by a command that would make a canary" "$GOOD; touch $CANARY"
expect_refused "refused: command substitution" "\$(touch $CANARY)0123456789abcdef0123456789abcdef"
expect_refused "refused: SHA followed by a newline" "$GOOD"$'\n'
expect_refused "refused: SHA with a newline and a command" "$GOOD"$'\n'"touch $CANARY"
expect_refused "refused: two arguments" "$GOOD" "$GOOD"

# Case: refused input also does nothing when the app directory is missing.
name="refused input is checked before the app directory"
: >"$LOG"
run_deploy "$WORK/does-not-exist" "latest"
if [ "$RC" -eq 2 ] && [ "$(call_count)" -eq 0 ]; then ok "$name"; else bad "$name" "exit $RC"; fi

# Case: a failed pull exits non-zero and keeps the old stored tag.
new_app "$APP"
(
  export STUB_FAIL_PULL=1
  run_deploy "$APP" "$GOOD"
  exit "$RC"
)
RC=$?
name="failed pull: non-zero exit, old tag kept, no restart"
if [ "$RC" -eq 0 ]; then
  bad "$name" "exit code 0"
elif [ "$(stored_tag "$APP")" != "$OLD" ]; then
  bad "$name" "stored tag is '$(stored_tag "$APP")'"
elif [ "$(call_count)" -ne 1 ] || grep -q '\[up\]' "$LOG"; then
  bad "$name" "docker calls: $(call_count)"
elif [ "$(find "$APP" -mindepth 1 -maxdepth 1 ! -name compose.yaml ! -name .env | wc -l)" -ne 0 ]; then
  bad "$name" "a temp file was left"
else
  ok "$name"
fi

# Case: no compose.yaml in the app directory.
EMPTY="$WORK/empty"
mkdir -p "$EMPTY"
: >"$LOG"
run_deploy "$EMPTY" "$GOOD"
name="missing compose.yaml: non-zero exit, no docker call, no .env"
if [ "$RC" -ne 0 ] && [ "$(call_count)" -eq 0 ] && [ ! -e "$EMPTY/.env" ]; then
  ok "$name"
else
  bad "$name" "exit $RC, calls $(call_count)"
fi

# Case: no .env yet (first deploy) is created with the new tag.
FRESH="$WORK/fresh"
mkdir -p "$FRESH"
: >"$FRESH/compose.yaml"
: >"$LOG"
run_deploy "$FRESH" "$GOOD"
name="first deploy: .env is created with the new tag"
if [ "$RC" -eq 0 ] && [ "$(stored_tag "$FRESH")" = "$GOOD" ] && [ "$(call_count)" -eq 2 ]; then
  ok "$name"
else
  bad "$name" "exit $RC, tag '$(stored_tag "$FRESH")'"
fi

echo "deploy.test: ${CASES} cases, ${FAILED} failed"
[ "$FAILED" -eq 0 ]
