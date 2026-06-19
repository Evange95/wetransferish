FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
RUN pnpm install --frozen-lockfile --filter @wetransferish/backend --filter @wetransferish/shared

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/backend/ packages/backend/
RUN cd packages/shared && pnpm build
RUN cd packages/backend && pnpm build

FROM node:22-alpine AS production
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/src ./packages/shared/src
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
COPY packages/backend/src/infrastructure/persistence/schema.sql packages/backend/src/infrastructure/persistence/

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "packages/backend/dist/main.js"]
