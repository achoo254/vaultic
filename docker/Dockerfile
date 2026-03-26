FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY backend/package.json backend/
COPY shared/types/package.json shared/types/
RUN pnpm install --frozen-lockfile --filter @vaultic/backend --filter @vaultic/types

# Build
FROM deps AS build
COPY backend/ backend/
COPY shared/types/ shared/types/
COPY tsconfig.base.json ./
RUN pnpm --filter @vaultic/types build
RUN pnpm --filter @vaultic/backend build

# Production
FROM node:22-alpine AS production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --from=deps /app/shared/types/node_modules ./shared/types/node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/package.json ./backend/
COPY --from=build /app/backend/src/static ./backend/dist/static
COPY --from=build /app/shared/types/dist ./shared/types/dist
COPY --from=build /app/shared/types/package.json ./shared/types/

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "backend/dist/server.js"]
