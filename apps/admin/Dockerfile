FROM node:24-alpine AS build
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate
WORKDIR /app
# VITE_* se incrusta en build: debe llegar como build-arg (Dokploy: Build Args)
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL
COPY pnpm-workspace.yaml package.json .npmrc ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --filter @hotel/admin...
COPY . .
RUN pnpm --filter @hotel/admin build

FROM nginx:1.27-alpine
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
