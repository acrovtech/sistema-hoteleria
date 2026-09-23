# SISTEMA HOTEL - Arquitectura Admin vs Frontend

Ubicación: `Desktop/sistema hotel`

## 1. Objetivo
Sistema completo de hotel con 2 dominios separados, pero con posibilidad de vender **SOLO el ADMIN** como sistema interno.

```
VENTA 1: COMPLETO = Admin + Frontend + API
VENTA 2: SOLO-ADMIN = Admin + API (sin web pública)
```

## 2. Separación por dominios

| App | Dominio sugerido | Descripción | Vendible solo? |
|-----|------------------|-------------|----------------|
| `apps/admin` | `admin.mihotel.com` | Sistema interno: reservas, check-in/out, habitaciones, clientes, caja, reportes, usuarios | **SÍ - es el producto base** |
| `apps/frontend` | `www.mihotel.com` | Web pública: home, habitaciones, motor de reservas, contacto, promos | NO, depende de API |
| `apps/api` | `api.mihotel.com` | Backend único para ambos | SIEMPRE incluido |

Regla de oro: **Frontend NUNCA habla directo a DB. Admin TAMPOCO. Todo pasa por API.**

## 3. Estructura creada (Monorepo)

```
sistema hotel/
  apps/
    admin/        -> Sistema interno (SPA privada)
    frontend/     -> Web pública + booking (SSR/SSG)
    api/          -> Backend REST (NestJS/Express + Prisma)
  packages/
    shared-types/ -> Tipos TS compartidos (Hotel, Habitacion, Reserva, Cliente)
    ui/           -> Componentes compartidos (botones, tablas, calendarios)
  docs/
    ARQUITECTURA.md (este archivo)
  docker-compose.full.yml      -> Despliega todo
  docker-compose.admin-only.yml -> Solo API + ADMIN + DB
```

## 4. Cómo logramos el modo SOLO-ADMIN

1.  **Despliegue independiente:** Cada app es un Docker separado.
    - Completo: `docker compose -f docker-compose.full.yml up`
    - Solo-admin: `docker compose -f docker-compose.admin-only.yml up` (no levanta frontend)

2.  **Feature Flag en API:**
    ```env
    # .env completo
    ENABLE_PUBLIC_WEBSITE=true
    ENABLE_BOOKING_ENGINE=true

    # .env solo-admin
    ENABLE_PUBLIC_WEBSITE=false
    ENABLE_BOOKING_ENGINE=false
    ```
    Si es false, API bloquea rutas públicas `/public/*` y solo deja `/admin/*` + `/auth/*`.

3.  **Módulos Backend separados:**
    ```
    api/src/
      core/        -> SIEMPRE activo: auth, users, rooms, reservations, clients, payments, reports
      public/      -> SOLO si ENABLE_PUBLIC_WEBSITE=true: cms, promos, reviews, booking-public
    ```

4.  **Licenciamiento:** tabla `licenses` en DB: `plan: 'FULL' | 'ADMIN_ONLY'`, `hotel_id`, `expires_at`. Middleware valida plan.

## 5. Stack fijado (pnpm only + versiones estables evaluadas 10-sep-2026)

> Nota: no hay MCP context7 en este entorno, evaluado con la misma fuente que usa context7: `pnpm view` / npm registry `dist-tags` + changelogs oficiales.

- **Package manager:** pnpm 11.20.0 only (`packageManager` + `pnpm-workspace.yaml`, prohibido npm).
  Comandos: `pnpm install`, `pnpm dev:api`, `pnpm dev:admin`.

- **API:** NestJS 11.2.3 (NO v12) + `@nestjs/config 4.0.x` + `@nestjs/jwt 11.0.2` + TS 5.9.3
  Por qué no v12: v12.0.1 salió 27-ago-2026 (hace 2 semanas), ESM-first, requiere Node 20.19+/22.12+, cambia defaults a Vitest/oxlint/Rspack. Para un sistema vendible hoy, 11.2.x es LTS battle-tested. Upgrade a 12 cuando madure.
  Módulos: `auth` (login/refresh con rotación + tabla `RefreshToken`, logout, register con matriz de roles), `core/*` (hotel, room-type, room, client, reservation, license), `public/booking` (`@Public()`, gate por flag + plan efectivo de `licenses`).
  Reservas: creación en transacción `Serializable` (P2034 → 409), state-machine de habitación/reserva, dinero en `Decimal(10,2)` serializado como número en la API.
- **ORM:** Prisma 7.10.0 pineado en `prisma` + `@prisma/client` (NO latest).
  Por qué: `latest` = 8.0.0-rc.13 (RC), `prev` = 7.10.0 estable. Mezclar client 7 con CLI 8 rompe migrate/generate. Quedarse en 7.10.0.
  Schema con enums (`RoomStatus`, `ReservationStatus`, `ReservationOrigin`), FKs con `onDelete: Restrict` (+ `Cascade` en refresh tokens), `@@index` por `hotelId`, `notes` en reservas.
- **Admin:** React 19.3.0 + react-router-dom 7.18.3 (v7, no v6) + TanStack Query 5.102.8 + axios 1.20.0 + Vite 7.3.6 + plugin-react 4.7.0 + TS 5.9.3 (ver `apps/admin/package.json`; incluye `tsconfig.json`, login, interceptor con refresh y rutas protegidas)
  Por qué TS 5.9 y no 7.0.2: TS 7 rompe decoradores de Nest y tooling. 5.9 es el estable real para Nest11 + Vite7.
- **DB:** PostgreSQL 16 + `hotel_id` tenant en todas las tablas.
- **Auth:** JWT + Refresh + Roles: `SUPERADMIN, ADMIN_HOTEL, RECEPCION, LIMPIEZA, CLIENTE`.
- **Storage:** S3 compatible. **Pagos:** Stripe / MercadoPago / Yape manual.

## 6. Base de Datos (una sola, multi-hotel a futuro)

Tablas core:
`hotels, users, rooms, room_types, clients, reservations, payments, cash_register, services, reports_cache, licenses`

Todas con `hotel_id` para que mañana puedas vender a N hoteles (SaaS).

## 7. Estado (sep-2026, verificado con build)

- [x] `apps/api` con auth + CRUD habitaciones + reservas/check-in/out + tenant isolation
- [x] `apps/admin` con login + dashboard + habitaciones + reservas (placeholders de negocio, auth funcional)
- [x] Los 2 docker-compose (admin sirve con nginx, api aplica `migrate deploy` al arrancar, healthchecks)
- [ ] `apps/frontend` fase 2 (hoy placeholder estático para que el compose full construya)
- [ ] Caja, pagos, reportes

## 8. Puesta en marcha local

```bash
corepack enable
corepack prepare pnpm@11.20.0 --activate
pnpm install
# Requiere Postgres local (ver DATABASE_URL en apps/api/.env):
pnpm db:migrate   # aplica migraciones pendientes
pnpm dev:api
pnpm dev:admin
```

> `.env` es local y no se versiona. `CONTEXT7_API_KEY` va por entorno (ver `scripts/context7.mjs`).
