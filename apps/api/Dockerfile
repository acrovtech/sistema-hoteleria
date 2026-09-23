FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@12.6.0 --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --filter @hotel/api...
COPY . .
RUN pnpm --filter @hotel/api prisma:generate
RUN pnpm --filter @hotel/api build
# Aplica migraciones pendientes y arranca (migrate deploy es idempotente)
CMD ["sh", "-c", "pnpm --filter @hotel/api exec prisma migrate deploy && pnpm --filter @hotel/api start"]
