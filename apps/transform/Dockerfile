# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
RUN apt-get update && apt-get install -y --no-install-recommends openssl && \
  rm -rf /var/lib/apt/lists/*

FROM base AS prune
COPY . .
RUN pnpm dlx turbo@2.9.16 prune @keenpix/transform-app --docker

FROM base AS build
COPY --from=prune /app/out/json/ .
COPY --from=prune /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm-transform,target=/pnpm/store \
  pnpm install --frozen-lockfile --config.minimumReleaseAge=0
COPY --from=prune /app/out/full/ .
COPY tsconfig.package.json ./tsconfig.package.json
RUN pnpm --filter @keenpix/database generate && \
  pnpm --filter @keenpix/transform-app... build

FROM base AS runner
ENV NODE_ENV=production
ENV KEENPIX_TRANSFORM_PORT=3002
ENV KEENPIX_CACHE_DIR=/var/cache/keenpix
RUN apt-get update && apt-get install -y --no-install-recommends curl && \
  rm -rf /var/lib/apt/lists/* && \
  useradd --create-home --uid 1001 keenpix && \
  mkdir -p /var/cache/keenpix && chown -R keenpix:keenpix /var/cache/keenpix
COPY --from=build --chown=keenpix:keenpix /app /app
USER keenpix
EXPOSE 3002
CMD ["node", "--import", "/app/apps/transform/node_modules/tsx/dist/loader.mjs", "apps/transform/src/index.ts"]
