# Keenpix — Node container (sharp needs Node; this is the deploy target, not CF Workers).
# Debian-slim so sharp's prebuilt libvips binary loads cleanly.
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# Pin pnpm to match the dev host (avoids newer-pnpm default policies).
# openssl: silences Prisma's libssl detection warning at migrate time.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable && corepack prepare pnpm@10.30.3 --activate
WORKDIR /app

# ── deps ──────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --config.minimumReleaseAge=0

# ── build ─────────────────────────────────────────────────────
FROM base AS build
ARG VITE_KEENPIX_PUBLIC_URL=http://localhost:3000
ARG VERSION=0.1.0
ENV VITE_KEENPIX_PUBLIC_URL=$VITE_KEENPIX_PUBLIC_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm exec prisma generate
RUN pnpm build

# ── runner ────────────────────────────────────────────────────
FROM base AS runner
ARG VERSION=0.1.0
ENV NODE_ENV=production
ENV PORT=3000
ENV KEENPIX_SELF_HOST=true
ENV KEENPIX_CACHE_DIR=/var/cache/keenpix
# sharp, dns.lookup and fs all share libuv's threadpool (default 4); raise it so
# concurrent transforms don't starve origin fetches. Must be set before Node boots.
ENV UV_THREADPOOL_SIZE=8
LABEL org.opencontainers.image.title="Keenpix" \
  org.opencontainers.image.description="Self-hosted image optimization service" \
  org.opencontainers.image.licenses="MIT" \
  org.opencontainers.image.source="https://github.com/lord007tn/keenpix" \
  org.opencontainers.image.version=$VERSION
COPY --from=build /app/.output ./.output
COPY --from=build /app/node_modules ./node_modules
# The @prisma/studio-core override links into tools/ (radix purge); the prisma
# CLI eagerly requires it at migrate time, so the symlink target must be present.
COPY --from=build /app/tools ./tools
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/package.json ./package.json
# Run as the unprivileged `node` user. Own the cache dir so the named volume
# inherits node ownership on first creation (Docker seeds an empty volume from
# the image mountpoint's perms).
RUN mkdir -p /var/cache/keenpix && chown -R node:node /var/cache/keenpix
USER node
EXPOSE 3000
# Apply migrations, then boot the Nitro node-server build. Invoke the prisma CLI
# JS directly — the node_modules/.bin/prisma shim re-enters pnpm (deps-status
# check) which, as non-root, writes to /app and crashes with EACCES.
CMD ["sh", "-c", "export PATH=/app/node_modules/.bin:$PATH && node node_modules/prisma/build/index.js migrate deploy && node node_modules/prisma/build/index.js db seed && node .output/server/index.mjs"]
