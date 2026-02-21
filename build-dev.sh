#!/bin/bash
set -e

docker compose \
  -f docker-compose.yml \
  -f docker-compose.override.yml \
  -f docker-compose.dev.yml \
  up -d --build admin-panel "$@"
