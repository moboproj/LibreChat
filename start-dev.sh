#!/bin/bash
set -e

CMD=${1:-up}

if [ "$CMD" = "down" ]; then
  docker compose \
    -f docker-compose.yml \
    -f docker-compose.override.yml \
    -f docker-compose.dev.yml \
    down "${@:2}"
else
  docker compose \
    -f docker-compose.yml \
    -f docker-compose.override.yml \
    -f docker-compose.dev.yml \
    up -d "$@"
fi
