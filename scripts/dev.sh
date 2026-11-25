#!/usr/bin/env bash
# Run the API and web UI together on the same development hostname.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
for tool in npm go; do
  command -v "$tool" >/dev/null || { echo "Missing required tool: $tool" >&2; exit 1; }
done
if [ ! -d "$ROOT/webui/node_modules" ]; then
  (cd "$ROOT/webui" && npm ci)
fi
# Caller settings win; otherwise load the same file as the API dev script.
ENV_FILE="$ROOT/server/management/.env"
[ -f "$ENV_FILE" ] || ENV_FILE="$ROOT/server/management/.env.example"
caller_env=$(export -p | grep ' GOFF_MGMT_' || true)
set -a
source "$ENV_FILE"
set +a
eval "$caller_env"
export GOFF_MGMT_AUTH_POSTLOGINREDIRECT="http://goff.local:5173/"
export GOFF_MGMT_OIDC_REDIRECTURL="http://goff.local:5173/auth/callback"
echo "==> Studio UI: http://goff.local:5173"
echo "    API:       http://goff.local:${GOFF_MGMT_SERVER_PORT:-8080}"
API_PID=""; WEB_PID=""
cleanup() {
  trap - EXIT INT TERM
  [ -z "$WEB_PID" ] || kill "$WEB_PID" 2>/dev/null || true
  [ -z "$API_PID" ] || kill "$API_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
(cd "$ROOT/webui" && exec node node_modules/vite/bin/vite.js) &
WEB_PID=$!
# Building avoids leaving a go-run child behind when the supervisor exits.
bash "$ROOT/server/management/scripts/dev.sh" "$@" --build &
API_PID=$!
while kill -0 "$WEB_PID" 2>/dev/null && kill -0 "$API_PID" 2>/dev/null; do sleep 1; done
if ! kill -0 "$WEB_PID" 2>/dev/null; then wait "$WEB_PID"; else wait "$API_PID"; fi
