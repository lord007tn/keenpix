# syntax=docker/dockerfile:1.7

# Node is the deploy target because sharp needs the native libvips runtime.
# Alpine keeps the runtime smaller; sharp and Prisma both publish musl builds.
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PNPM_STORE_DIR=/pnpm/store
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app

FROM base AS runtime-deps
# openssl keeps Prisma engine detection quiet at migrate time; curl powers the
# Compose healthcheck without running a Node one-liner inside the container.
RUN apk add --no-cache curl openssl

FROM runtime-deps AS package-manager
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

FROM package-manager AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile --config.minimumReleaseAge=0 --store-dir=$PNPM_STORE_DIR

FROM package-manager AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --prod --frozen-lockfile --config.minimumReleaseAge=0 --store-dir=$PNPM_STORE_DIR

FROM deps AS build
ARG VITE_KEENPIX_PUBLIC_URL
ARG VERSION=0.1.0
ENV VITE_KEENPIX_PUBLIC_URL=$VITE_KEENPIX_PUBLIC_URL
COPY . .
RUN pnpm exec prisma generate
RUN pnpm build

FROM runtime-deps AS runner
ARG VERSION=0.1.0
ENV NODE_ENV=production
ENV PORT=3000
ENV KEENPIX_SELF_HOST=true
ENV KEENPIX_CACHE_DIR=/var/cache/keenpix
# sharp, DNS lookups, and fs share libuv's threadpool. Raise it so concurrent
# transforms do not starve origin fetches. Must be set before Node starts.
ENV UV_THREADPOOL_SIZE=8
LABEL org.opencontainers.image.title="Keenpix" \
  org.opencontainers.image.description="Self-hosted image optimization service" \
  org.opencontainers.image.licenses="Apache-2.0" \
  org.opencontainers.image.source="https://github.com/lord007tn/keenpix" \
  org.opencontainers.image.version=$VERSION
COPY --from=build /app/.output ./.output
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/package.json ./package.json
COPY --chmod=755 docker-entrypoint.sh ./docker-entrypoint.sh
# Run as the unprivileged node user. Own the cache directory so a named Docker
# volume inherits usable permissions the first time it is created.
RUN mkdir -p /var/cache/keenpix && chown -R node:node /var/cache/keenpix
USER node
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["start"]
