# PROMPT — Task 4: Reservas + Check-in/out + Estados Habitación

## ROLE
You are a senior NestJS backend engineer. Implement Task 4 exactly. Use Context7 live docs before coding. Use pnpm only. Do not use npm.

## CONTEXT
- Monorepo: `C:\Users\ADRIANO\Desktop\sistema hotel` (pnpm-workspace.yaml, packageManager pnpm@11.20.0)
- Docs: `docs/ARQUITECTURA.md` — Admin (admin.mihotel.com) is vendible solo; Frontend is phase 2; API is `api.mihotel.com`.
- API: `apps/api` — NestJS 11.2.3 / @nestjs/config 4.0.4 / @nestjs/jwt 11.0.2 / Prisma 7.10.0 / TypeScript 5.9.3 / Node >=20
- Prisma: `apps/api/prisma/schema.prisma` ya migrado (migration 20260911053622_init) a DB local (`DATABASE_URL` en `.env`, ver `.env.example`). Modelos: Hotel, User (Role enum: SUPERADMIN, ADMIN_HOTEL, RECEPCION, LIMPIEZA, CLIENTE), RoomType, Room, Client, Reservation, License. Datasource URL en `prisma.config.ts` + adapter (`PrismaPg` vía `PrismaService`).
- Auth: Task 2 complete. `JwtAuthGuard` + `RolesGuard` global. Decorators: `@Public()`, `@Roles(...)`, `@CurrentUser()`. `AuthService` with `login/refresh/me/register`. Payload: `{sub, email, role, hotelId}`.
- Task 3 complete: CRUD core (Hotel, RoomType, Room, Client) with tenant isolation via `tenant.helper.ts` (`resolveTenantHotelId`, `resolveCreateHotelId`). Modules: HotelModule, RoomTypeModule, RoomModule, ClientModule.
- Env: `apps/api/.env` (local, no versionado — ver `.env.example`). Nunca poner secretos reales en docs ni en git.
- Scripts: `scripts/context7.mjs` (MCP @upstash/context7-mcp). Use it:
  `node scripts/context7.mjs search "NestJS" "reservation system Prisma"`
  `node scripts/context7.mjs query "/nestjs/nest" "multi-tenant reservation"`

## OBJECTIVE
Implement production-ready reservations module with check-in/check-out workflow and room state machine.

### Reservation States (string enum in schema):
```
CONFIRMADA → CHECKED_IN → CHECKED_OUT → CANCELADA
     ↓           ↓            ↓
  CANCELADA   CANCELADA    (final)
```

### Room States (string enum in schema):
```
DISPONIBLE → OCUPADA → LIMPIEZA → DISPONIBLE
   ↑           ↓
   └───────────┘ (checkout → limpieza → disponible)
```

## HARD CONSTRAINTS
- pnpm only (`pnpm add`, `pnpm --filter @hotel/api ...`). Never npm.
- Keep Nest 11. Keep Prisma 7. Do not upgrade to Nest 12 or Prisma 8 RC.
- Prisma v7 requires `PrismaService` via `ConfigService` (already fixed in Task 2). Keep it.
- Use global guards: everything protected by default, `@Roles(...)` per route.
- Tenant isolation: every query filtered by `hotelId` from `@CurrentUser()` payload. SUPERADMIN can override with explicit `hotelId` query param if provided.
- DTOs with `class-validator` + `whitelist:true, forbidNonWhitelisted:true, transform:true` (global).
- No `any`, no `console.log`, no `eslint-disable`. ESLint/Prettier clean.
- DTOs returned by service: sanitize (no internal flags).

## DELIVERABLE — Implement all:

### 1) ReservationModule `apps/api/src/core/reservation/`
**Entities**: Reservation (already in schema), Room (state machine), Client.

**Endpoints** (`/api/reservations`):

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/` | SUPERADMIN, ADMIN_HOTEL, RECEPCION | List with filters: status, clientId, roomId, dateFrom, dateTo, page, limit |
| POST | `/` | SUPERADMIN, ADMIN_HOTEL, RECEPCION | Create reservation (check-in futuro) |
| GET | `/:id` | SUPERADMIN, ADMIN_HOTEL, RECEPCION | Detail |
| PATCH | `/:id` | SUPERADMIN, ADMIN_HOTEL, RECEPCION | Update (solo campos permitidos: notas, fechas si no checked-in) |
| POST | `/:id/check-in` | SUPERADMIN, ADMIN_HOTEL, RECEPCION | Check-in: valida habitación DISPONIBLE, setea Reservation=CHECKED_IN, Room=OCUPADA |
| POST | `/:id/check-out` | SUPERADMIN, ADMIN_HOTEL, RECEPCION | Check-out: valida CHECKED_IN, setea Reservation=CHECKED_OUT, Room=LIMPIEZA |
| POST | `/:id/cancel` | SUPERADMIN, ADMIN_HOTEL, RECEPCION | Cancelar: solo si CONFIRMADA, libera Room=DISPONIBLE |
| GET | `/calendar` | SUPERADMIN, ADMIN_HOTEL, RECEPCION | Vista calendario: `/calendar?from=2026-09-01&to=2026-09-30` → ocupación por día/habitación |

**DTOs**:
- `CreateReservationDto`: clientId, roomId, checkIn (ISO), checkOut (ISO), total?, origin='ADMIN', notes?
- `UpdateReservationDto`: checkIn?, checkOut?, total?, notes? (solo si status=CONFIRMADA)
- `ListReservationsQueryDto`: status?, clientId?, roomId?, checkInFrom?, checkInTo?, page, limit, hotelId?
- `CalendarQueryDto`: from (ISO), to (ISO), hotelId?

**Service Logic**:
- `create`: valida room DISPONIBLE en rango (no overlaps), client existe y mismo hotel, calcula total = nights * roomType.priceBase (override con dto.total si viene).
- `checkIn`: valida status=CONFIRMADA, room DISPONIBLE, checkIn <= today <= checkOut, transacción: Reservation=CHECKED_IN + Room=OCUPADA + actualiza checkIn real = now().
- `checkOut`: valida status=CHECKED_IN, transacción: Reservation=CHECKED_OUT + Room=LIMPIEZA + actualiza checkOut real = now().
- `cancel`: solo CONFIRMADA, transacción: Reservation=CANCELADA + Room=DISPONIBLE.
- `findAll`: tenant filter + filtros. `calendar`: devuelve matriz habitación x día con status/reservaId.
- **Overlap check**: `WHERE roomId = X AND status IN ('CONFIRMADA','CHECKED_IN') AND checkIn < newCheckOut AND checkOut > newCheckIn`

### 2) Room State Machine Helper
- `RoomStateMachine` class/service with static methods: `canTransition(current, next)`, `applyTransition(roomId, nextStatus, prisma)`.
- Valid transitions:
  - DISPONIBLE → OCUPADA (check-in)
  - OCUPADA → LIMPIEZA (check-out)
  - LIMPIEZA → DISPONIBLE (limpieza terminada)
  - Any → MANTENIMIENTO (manual, solo SUPERADMIN/ADMIN_HOTEL)
  - MANTENIMIENTO → DISPONIBLE (manual)

### 3) Availability Service (para motor de reservas futuro)
- `AvailabilityService.getAvailableRooms(hotelId, checkIn, checkOut, roomTypeId?)` → rooms[] DISPONIBLE sin overlaps.
- Usa raw query o Prisma `$queryRaw` para performance.

### 4) Module Integration
- Add `ReservationModule` to `app.module.ts` imports (already there from scaffold).
- Export `ReservationService` if needed by future modules.

## VERIFICATION (must pass)
1. pnpm --filter @hotel/api exec prisma generate
2. pnpm --filter @hotel/api exec nest build -> 0 errors
3. pnpm --filter @hotel/api dev -> starts on 3001
4. curl tests (auth via admin@hotel.test / Admin123!):
   - POST /api/reservations (create future) -> 201, room OCUPADA? No, CONFIRMADA room DISPONIBLE
   - POST /api/reservations/:id/check-in -> 200, Reservation=CHECKED_IN, Room=OCUPADA
   - POST /api/reservations/:id/check-out -> 200, Reservation=CHECKED_OUT, Room=LIMPIEZA
   - POST /api/reservations/:id/cancel (solo CONFIRMADA) -> 200, room DISPONIBLE
   - Overlap rejection -> 409
   - Invalid transition (check-in ya checked-in) -> 400
   - Calendar endpoint -> 200 matriz
   - Tenant isolation (ADMIN_HOTEL solo su hotel) -> 403 cross
   - Validation (whitelist, dates ISO, checkOut > checkIn) -> 400
4. pnpm --filter @hotel/api exec tsc --noEmit -> 0

## WHAT TO OUTPUT
- List files created/modified.
- Show Context7 queries used + snippets applied.
- Brief explanation of state machine and overlap check logic.

## OUT OF SCOPE
- Do not touch apps/admin or apps/frontend.
- Do not change Auth (Task 2 frozen) or core CRUD (Task 3 frozen).
- Do not implement webhooks, emails, SMS, pagos (fase 2).
- Do not change schema (use existing Reservation/Room models).

## AUDIT CRITERIA (reviewer will check)
- pnpm only, lockfile passes, no npm artifacts
- Guards/Decorators from Task 2 used correctly
- Tenant isolation enforced in every service method
- State machine enforced (no invalid transitions)
- Overlap check prevents double-booking
- Room state synced with reservation state in transactions
- DTOs validate: whitelist, transform, forbidNonWhitelisted, dates ISO
- Calendar endpoint returns useful shape for UI
- `tsc --noEmit` clean, `build` clean
- No `any`, no eslint disables