# PROMPT — Task 3: CRUD Core (Hoteles, RoomTypes, Habitaciones, Clientes)

## ROLE
You are a senior NestJS backend engineer. Implement Task 3 exactly. Use Context7 live docs before coding. Use pnpm only. Do not use npm.

## CONTEXT
- Monorepo: `C:\Users\ADRIANO\Desktop\sistema hotel` (pnpm-workspace.yaml, packageManager pnpm@11.20.0)
- Docs: `docs/ARQUITECTURA.md` — Admin (admin.mihotel.com) is vendible solo; Frontend is phase 2; API is `api.mihotel.com`.
- API: `apps/api` — NestJS 11.2.3 / @nestjs/config 4.0.4 / @nestjs/jwt 11.0.2 / Prisma 7.10.0 / TypeScript 5.9.3 / Node >=20
- Prisma: `apps/api/prisma/schema.prisma` ya migrado (migration 20260911053622_init) a DB local (`DATABASE_URL` en `.env`, ver `.env.example`). Modelos: Hotel, User (Role enum: SUPERADMIN, ADMIN_HOTEL, RECEPCION, LIMPIEZA, CLIENTE), RoomType, Room, Client, Reservation, License. Datasource URL en `prisma.config.ts` + adapter (`PrismaPg` vía `PrismaService`).
- Auth: Task 2 complete. `JwtAuthGuard` + `RolesGuard` global. Decorators: `@Public()`, `@Roles(...)`, `@CurrentUser()`. `AuthService` with `login/refresh/me/register`. Payload: `{sub, email, role, hotelId}`.
- Env: `apps/api/.env` (local, no versionado — ver `.env.example`). Nunca poner secretos reales en docs ni en git.
- Scripts: `scripts/context7.mjs` (MCP @upstash/context7-mcp). Use it:
  `node scripts/context7.mjs search "NestJS" "CRUD Prisma tenant"`
  `node scripts/context7.mjs query "/nestjs/nest" "multi-tenant CRUD"`

## OBJECTIVE
Implement production-ready CRUD for core entities with tenant isolation (`hotelId` from JWT).

### Entities (already in schema):
- Hotel
- RoomType
- Room
- Client

## HARD CONSTRAINTS
- pnpm only (`pnpm add`, `pnpm --filter @hotel/api ...`). Never npm.
- Keep Nest 11. Keep Prisma 7. Do not upgrade to Nest 12 or Prisma 8 RC.
- Prisma v7 requires `PrismaService` via `ConfigService` (already fixed in Task 2). Keep it.
- Use global guards: everything protected by default, `@Roles(...)` per route.
- Tenant isolation: every query filtered by `hotelId` from `@CurrentUser()` payload. SUPERADMIN can override with explicit `hotelId` query param if provided.
- DTOs with `class-validator` + `whitelist:true, forbidNonWhitelisted:true, transform:true` (global).
- No `any`, no `console.log`, no `eslint-disable`. ESLint/Prettier clean.
- DTOs returned by service: sanitize (no passwords, internal flags).

## DELIVERABLE — Implement all:

### 1) HotelModule `apps/api/src/core/hotel/`
- `HotelController`:
  GET `/api/hotels` (SUPERADMIN only) — list all
  POST `/api/hotels` (SUPERADMIN only) — create hotel + plan
  GET `/api/hotels/:id` (SUPERADMIN or ADMIN_HOTEL owner) — detail
  PATCH `/api/hotels/:id` (SUPERADMIN or ADMIN_HOTEL owner) — update name/plan
  DELETE `/api/hotels/:id` (SUPERADMIN only) — delete (cascade check: no users/rooms)
- `HotelService`: CRUD with tenant checks (SUPERADMIN sees all, ADMIN_HOTEL only own).
- DTOs: `CreateHotelDto` (name, slug, plan), `UpdateHotelDto` (partial).
- `@Roles(Role.SUPERADMIN)` for list/create/delete; `@Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL)` for read/update with ownership check in service.

### 2) RoomTypeModule `apps/api/src/core/room-type/`
- `RoomTypeController`:
  GET `/api/room-types` (SUPERADMIN, ADMIN_HOTEL) — list for hotelId (from JWT or query if SUPERADMIN)
  POST `/api/room-types` (SUPERADMIN, ADMIN_HOTEL) — create with hotelId (from JWT if ADMIN_HOTEL, body if SUPERADMIN)
  GET `/api/room-types/:id` — detail
  PATCH `/api/room-types/:id` — update name/priceBase/capacity/description
  DELETE `/api/room-types/:id` — delete (check no rooms)
- `RoomTypeService`: tenant-filtered. SUPERADMIN can specify `hotelId` in query/body; ADMIN_HOTEL uses JWT `hotelId`.
- DTOs: `CreateRoomTypeDto` (name, priceBase, capacity, description?, hotelId?), `UpdateRoomTypeDto` (partial).

### 3) RoomModule `apps/api/src/core/room/`
- `RoomController`:
  GET `/api/rooms` — list with filters: status, typeId, hotelId (JWT or query for SUPERADMIN)
  POST `/api/rooms` — create (number, typeId, status). hotelId from JWT (ADMIN_HOTEL) or body (SUPERADMIN)
  GET `/api/rooms/:id` — detail
  PATCH `/api/rooms/:id` — update status (DISPONIBLE|OCUPADA|LIMPIEZA|MANTENIMIENTO), typeId
  DELETE `/api/rooms/:id` — delete (check no active reservations)
- `RoomService`: tenant-filtered. Status enum validation.
- DTOs: `CreateRoomDto` (number, typeId, status?, hotelId?), `UpdateRoomDto` (partial). Unique constraint: `[hotelId, number]`.

### 4) ClientModule `apps/api/src/core/client/`
- `ClientController`:
  GET `/api/clients` — list with search (name, dni, email, phone), pagination
  POST `/api/clients` — create (name, dni?, phone?, email?, hotelId from JWT or body)
  GET `/api/clients/:id` — detail
  PATCH `/api/clients/:id` — update
  DELETE `/api/clients/:id` — delete (check no active reservations)
- `ClientService`: tenant-filtered. DNI optional but unique per hotel if provided.

### 5) Shared Tenant Guard/Interceptor (optional but recommended)
- `TenantInterceptor` or helper in service to auto-apply `where: { hotelId: currentUser.hotelId }` for ADMIN_HOTEL, omit for SUPERADMIN unless explicit `hotelId` query param provided.
- Document pattern in `docs/TENANT_PATTERN.md`.

## VERIFICATION (must pass)
1. pnpm --filter @hotel/api exec prisma generate
2. pnpm --filter @hotel/api exec nest build  -> 0 errors
3. pnpm --filter @hotel/api dev -> starts on 3001
4. curl tests (auth via admin@hotel.test / Admin123!):
   - POST /api/hotels (SUPERADMIN) -> 201
   - POST /api/room-types (ADMIN_HOTEL) -> 201
   - POST /api/rooms (ADMIN_HOTEL) -> 201
   - POST /api/clients (ADMIN_HOTEL) -> 201
   - GET lists return only own hotel data
   - SUPERADMIN with ?hotelId=... can cross-query
   - 403 if ADMIN_HOTEL tries other hotel
   - 400 validation (whitelist, transform, forbidNonWhitelisted)
   - 404 if not found
   - 409 on duplicate (hotel slug, room number per hotel, dni per hotel if provided)
4. pnpm --filter @hotel/api exec tsc --noEmit -> 0

## WHAT TO OUTPUT
- List files created/modified.
- Show Context7 queries used + snippets applied.
- Brief explanation of tenant isolation pattern used.

## OUT OF SCOPE
- Do not touch apps/admin or apps/frontend.
- Do not change Auth (Task 2 is frozen).
- Do not implement Reservations (Task 4).
- Do not change schema (only CRUD on existing models).

## AUDIT CRITERIA (reviewer will check)
- pnpm only, lockfile passes, no npm artifacts
- Guards/Decorators from Task 2 used correctly
- Tenant isolation enforced in every service method
- SUPERADMIN cross-tenant via explicit param, ADMIN_HOTEL locked to JWT hotelId
- DTOs validate: whitelist, transform, forbidNonWhitelisted
- Unique constraints handled (409)
- Soft delete not required but hard delete with pre-checks (no orphans)
- `tsc --noEmit` clean, `build` clean
- No `any`, no eslint disables