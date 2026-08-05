# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PNPM_STORE_DIR=/pnpm/store
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app

FROM base AS package-manager
RUN apk add --no-cache curl openssl
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

FROM package-manager AS deps
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile --config.minimumReleaseAge=0 --store-dir=$PNPM_STORE_DIR

FROM package-manager AS prod-deps
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --prod --frozen-lockfile --config.minimumReleaseAge=0 --store-dir=$PNPM_STORE_DIR

FROM deps AS build
ARG VITE_KEENPIX_PUBLIC_URL
ARG VITE_GTM_CONTAINER_ID
ARG VITE_GA_MEASUREMENT_ID
ARG VERSION=0.3.0
ENV VITE_KEENPIX_PUBLIC_URL=$VITE_KEENPIX_PUBLIC_URL
ENV VITE_GTM_CONTAINER_ID=$VITE_GTM_CONTAINER_ID
ENV VITE_GA_MEASUREMENT_ID=$VITE_GA_MEASUREMENT_ID
RUN pnpm db:generate
RUN pnpm build:app
RUN pnpm --filter @keenpix/worker build

FROM package-manager AS runner
ARG VERSION=0.3.0
ENV NODE_ENV=production
ENV PORT=3000
ENV KEENPIX_CACHE_DIR=/var/cache/keenpix
ENV UV_THREADPOOL_SIZE=8
LABEL org.opencontainers.image.title="Keenpix" \
  org.opencontainers.image.description="Self-hosted image optimization service" \
  org.opencontainers.image.licenses="AGPL-3.0-only" \
  org.opencontainers.image.source="https://github.com/lord007tn/keenpix" \
  org.opencontainers.image.version=$VERSION
COPY --from=prod-deps /app /app
COPY --from=build /app/apps/app/.output /app/apps/app/.output
COPY --from=build /app/apps/worker/dist /app/apps/worker/dist
COPY --from=build /app/packages/database/src/generated /app/packages/database/src/generated
COPY --from=build /app/packages/queue/dist /app/packages/queue/dist
COPY --chmod=755 docker-entrypoint.sh /app/docker-entrypoint.sh
RUN mkdir -p /var/cache/keenpix && chown -R node:node /var/cache/keenpix
USER node
EXPOSE 3000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["start"]
