# Patrón de aislamiento multi-tenant (Task 3)

## Resumen

Toda la API está protegida por los guards globales (`JwtAuthGuard` + `RolesGuard`).
El aislamiento por hotel se deriva **siempre** del payload JWT (`@CurrentUser()`),
que tiene la forma `{ userId, email, role, hotelId }`. Nunca se confía en un
`hotelId` enviado por el cliente sin contrastarlo con el JWT.

## Reglas

| Rol | Listado | Detalle/Update/Delete por id | Creación |
|-----|---------|------------------------------|----------|
| `SUPERADMIN` | Ve **todos** los hoteles (`hotelId = null`) o uno concreto si pasa `?hotelId=` / `hotelId` en body | Accede a cualquier registro | Requiere `hotelId` explícito en el body (400 si falta) |
| `ADMIN_HOTEL` (y demás roles) | Enclaustrado en su `user.hotelId`; `hotelId` explícito distinto → **403** | Solo su hotel (registro de otro hotel → **404** para no filtrar existencia) | `hotelId` forzado al del JWT; body con otro hotel → **403** |

### Semántica 403 vs 404

- **403 (ForbiddenException)** se usa cuando el usuario *intenta* operar fuera de
  su hotel de forma explícita: `hotelId` en query/body distinto de su hotel, o
  (para `Hotel`) cuando pide un `:id` que no es el suyo. El objetivo es indicar
  "no tienes permiso" sin ambigüedad.
- **404 (NotFoundException)** se usa para acceso por `id` de `RoomType`, `Room` y
  `Client`: se añade `hotelId` a la cláusula `where` de Prisma, de modo que si el
  registro pertenece a otro hotel `findUnique` devuelve `null` y no se filtra la
  existencia del recurso.

### Excepción: Hotel

`Hotel` usa **403** en lectura/actualización para `ADMIN_HOTEL` cuando el `:id`
no coincide con su `user.hotelId` (es un check de propiedad explícito, no de
existencia). El mensaje es `No puede acceder a otro hotel`.

## Helper

```ts
// src/common/tenant/tenant.helper.ts
export function resolveTenantHotelId(
  user: CurrentUser,
  explicitHotelId?: string | null,
): string | null {
  if (user.role === Role.SUPERADMIN) return explicitHotelId ?? null;
  if (!user.hotelId) throw new ForbiddenException('Usuario sin hotel asignado');
  if (explicitHotelId && explicitHotelId !== user.hotelId)
    throw new ForbiddenException('No puede acceder a datos de otro hotel');
  return user.hotelId;
}

export function resolveCreateHotelId(
  user: CurrentUser,
  explicitHotelId?: string | null,
): string {
  if (user.role === Role.SUPERADMIN) {
    if (!explicitHotelId)
      throw new BadRequestException('hotelId es requerido para SUPERADMIN');
    return explicitHotelId;
  }
  if (!user.hotelId) throw new ForbiddenException('Usuario sin hotel asignado');
  if (explicitHotelId && explicitHotelId !== user.hotelId)
    throw new ForbiddenException('No puede acceder a datos de otro hotel');
  return user.hotelId;
}
```

## Ejemplo de uso en un servicio

```ts
// Listado (SUPERADMIN puede cruzar con ?hotelId=; ADMIN queda enclaustrado)
const hotelId = resolveTenantHotelId(user, query.hotelId);
const where = hotelId ? { hotelId } : {};

// Detalle por id (404 para registros de otro hotel, sin filtrar existencia)
const hotelId = resolveTenantHotelId(user);
const where = { id, ...(hotelId ? { hotelId } : {}) };
```

## Controllers

Los controladores reciben el usuario con `@CurrentUser()` y pasan `user` +
`hotelId` explícito al servicio:

```ts
@Get()
@Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL)
list(@Query() query: ListDto, @CurrentUser() user: CurrentUser) {
  return this.service.findAll(user, query.hotelId);
}
```
