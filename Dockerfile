FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json biome.json ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile=false
RUN pnpm build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build /app /app
EXPOSE 3000
CMD ["sh", "-c", "node apps/server/dist/index.js & exec pnpm --filter @whallet/web start"]
