#!/usr/bin/env bash
set -euo pipefail

# Find a free TCP port starting from the given default.
# Usage: find_free_port <default_port>
find_free_port() {
  local port=$1
  while ss -tlnp | grep -q ":${port} "; do
    ((port++))
  done
  echo "$port"
}

APP_PORT=$(find_free_port 3000)
MONGO_PORT=$(find_free_port 27017)
MAILPIT_SMTP_PORT=$(find_free_port 1025)
MAILPIT_WEB_PORT=$(find_free_port 8025)
STORYBOOK_PORT=$(find_free_port 6006)

export APP_PORT MONGO_PORT MAILPIT_SMTP_PORT MAILPIT_WEB_PORT STORYBOOK_PORT

echo "Starting with ports:"
echo "  App:           $APP_PORT"
echo "  Mongo:         $MONGO_PORT"
echo "  Mailpit SMTP:  $MAILPIT_SMTP_PORT"
echo "  Mailpit Web:   $MAILPIT_WEB_PORT"
echo "  Storybook:     $STORYBOOK_PORT"

docker compose up -d

echo ""
echo "App:       http://localhost:$APP_PORT"
echo "Mailpit:   http://localhost:$MAILPIT_WEB_PORT"
echo "Storybook: http://localhost:$STORYBOOK_PORT"
