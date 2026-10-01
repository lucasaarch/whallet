FROM node:22-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile --prod=false

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/ ./
COPY . .
RUN pnpm build
RUN pnpm --filter @whallet/server deploy --prod /app/server-runtime

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Next standalone output keeps the monorepo path: apps/web/server.js.
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/server-runtime ./server-runtime

EXPOSE 3000
CMD ["sh", "-c", "node /app/server-runtime/dist/index.js & exec node /app/apps/web/server.js"]
