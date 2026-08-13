#!/bin/sh
set -eu

export PATH="/app/node_modules/.bin:$PATH"

command="${1:-start}"

if [ "$command" = "migrate" ]; then
  exec pnpm --filter @keenpix/database deploy
fi

if [ "$command" = "seed" ]; then
  exec pnpm --filter @keenpix/database seed
fi

if [ "$command" != "start" ]; then
  exec "$@"
fi

run_migrations="${KEENPIX_RUN_MIGRATIONS:-true}"
if [ "$run_migrations" = "false" ] || [ "$run_migrations" = "0" ] || [ "$run_migrations" = "no" ]; then
  printf '[keenpix] Skipping database migrations\n'
else
  printf '[keenpix] Applying database migrations\n'
  pnpm --filter @keenpix/database deploy
fi

run_seed="${KEENPIX_RUN_SEED:-true}"
if [ "$run_seed" = "false" ] || [ "$run_seed" = "0" ] || [ "$run_seed" = "no" ]; then
  printf '[keenpix] Skipping database seed\n'
else
  printf '[keenpix] Seeding bootstrap data\n'
  pnpm --filter @keenpix/database seed
fi

printf '[keenpix] Starting Keenpix on port %s\n' "${PORT:-3000}"
exec node /app/apps/app/.output/server/index.mjs
