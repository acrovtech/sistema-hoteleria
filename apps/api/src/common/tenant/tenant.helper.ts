import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { CurrentUser } from '../../auth/jwt.strategy';

/**
 * Resuelve el `hotelId` efectivo para consultas de listado/lectura teniendo en
 * cuenta el rol del usuario y un `hotelId` explícito opcional (query/body).
 *
 * - SUPERADMIN: puede consultar todos los hoteles (`null`) o uno concreto si
 *   pasa `explicitHotelId`.
 * - Resto de roles (ADMIN_HOTEL, RECEPCION, LIMPIEZA, CLIENTE): quedan
 *   enclaustrados en su `user.hotelId`; si no tienen hotel asignado se lanza
 *   403 y si intentan acceder a otro hotel explícitamente se lanza 403.
 *
 * Devuelve `string | null` (null = "todos los hoteles" para SUPERADMIN).
 */
export function resolveTenantHotelId(
  user: CurrentUser,
  explicitHotelId?: string | null,
): string | null {
  if (user.role === Role.SUPERADMIN) {
    return explicitHotelId ?? null;
  }

  if (!user.hotelId) {
    throw new ForbiddenException('Usuario sin hotel asignado');
  }
  if (explicitHotelId && explicitHotelId !== user.hotelId) {
    throw new ForbiddenException('No puede acceder a datos de otro hotel');
  }
  return user.hotelId;
}

/**
 * Resuelve el `hotelId` para operaciones de CREACIÓN, donde el destino debe ser
 * siempre un hotel concreto (nunca `null`).
 *
 * - SUPERADMIN: el `hotelId` en el body es REQUERIDO (400 si falta).
 * - Resto de roles: se fuerza el `hotelId` del JWT; si el body indica otro
 *   hotel se lanza 403.
 */
export function resolveCreateHotelId(
  user: CurrentUser,
  explicitHotelId?: string | null,
): string {
  if (user.role === Role.SUPERADMIN) {
    if (!explicitHotelId) {
      throw new BadRequestException('hotelId es requerido para SUPERADMIN');
    }
    return explicitHotelId;
  }

  if (!user.hotelId) {
    throw new ForbiddenException('Usuario sin hotel asignado');
  }
  if (explicitHotelId && explicitHotelId !== user.hotelId) {
    throw new ForbiddenException('No puede acceder a datos de otro hotel');
  }
  return user.hotelId;
}
