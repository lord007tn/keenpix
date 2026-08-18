# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

FROM base AS prune
COPY . .
RUN pnpm dlx turbo@2.9.16 prune @keenpix/docs --docker

FROM base AS build
COPY --from=prune /app/out/json/ .
COPY --from=prune /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm-docs,target=/pnpm/store \
  pnpm install --frozen-lockfile --config.minimumReleaseAge=0
COPY --from=prune /app/out/full/ .
COPY tsconfig.package.json ./tsconfig.package.json
RUN pnpm --filter @keenpix/docs build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3003
RUN useradd --create-home --uid 1001 keenpix
COPY --from=build --chown=keenpix:keenpix /app /app
USER keenpix
EXPOSE 3003
CMD ["node", "apps/docs/.output/server/index.mjs"]
