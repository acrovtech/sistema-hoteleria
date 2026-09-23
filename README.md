# Sistema Hotel (pnpm monorepo)

Sistema completo con dominios separados:

- `apps/admin` -> admin.mihotel.com (SISTEMA INTERNO - vendible solo)
- `apps/frontend` -> www.mihotel.com (web pública)
- `apps/api` -> api.mihotel.com (backend único)

Ver `docs/ARQUITECTURA.md` para el plan completo.

## Requiere pnpm (no npm)

```bash
corepack enable
corepack prepare pnpm@11.20.0 --activate
pnpm install
pnpm dev:api
pnpm dev:admin
```

## Modos de venta

```bash
# Completo
docker compose -f docker-compose.full.yml up --build

# Solo Admin (sistema interno)
docker compose -f docker-compose.admin-only.yml up --build
```
