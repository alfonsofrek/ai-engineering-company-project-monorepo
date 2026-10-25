#!/bin/sh
# Starts both Next.js apps in development mode inside the UI container.
# If either process exits, stop the container so Compose reports the failure
# instead of leaving a half-working platform running.
set -eu

cd "$(dirname "$0")"

# UI_MODE=production (used on the VPS) builds once and serves optimized bundles;
# the default "development" mode runs `next dev` with hot reload.
if [ "${UI_MODE:-development}" = "production" ]; then
  npm --prefix website run build
  npm --prefix backoffice run build
  run_app() { npm --prefix "$1" run start -- --hostname 0.0.0.0 --port "$2"; }
else
  run_app() { npm --prefix "$1" run dev -- --hostname 0.0.0.0 --port "$2"; }
fi

# Inside the container the apps always listen on 3000/3001; the host ports are
# chosen in docker-compose.yml.
run_app website 3000 &
website_pid=$!

run_app backoffice 3001 &
backoffice_pid=$!

trap 'kill "$website_pid" "$backoffice_pid" 2>/dev/null' INT TERM

# Wait for the first app to exit, then stop the other one.
while kill -0 "$website_pid" 2>/dev/null && kill -0 "$backoffice_pid" 2>/dev/null; do
  sleep 2
done
echo "One of the Next.js apps stopped; shutting down the UI container." >&2
kill "$website_pid" "$backoffice_pid" 2>/dev/null || true
exit 1
