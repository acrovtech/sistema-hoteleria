import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export const ROOM_STATES = [
  'DISPONIBLE',
  'OCUPADA',
  'LIMPIEZA',
  'MANTENIMIENTO',
] as const;

export const RESERVATION_STATUSES = [
  'CONFIRMADA',
  'CHECKED_IN',
  'CHECKED_OUT',
  'CANCELADA',
] as const;

export type RoomState = (typeof ROOM_STATES)[number];
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const ROOM_TRANSITIONS: Record<RoomState, RoomState[]> = {
  DISPONIBLE: ['OCUPADA', 'MANTENIMIENTO'],
  OCUPADA: ['LIMPIEZA', 'MANTENIMIENTO'],
  LIMPIEZA: ['DISPONIBLE', 'MANTENIMIENTO'],
  MANTENIMIENTO: ['DISPONIBLE'],
};

export const RESERVATION_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  CONFIRMADA: ['CHECKED_IN', 'CANCELADA'],
  CHECKED_IN: ['CHECKED_OUT'],
  CHECKED_OUT: [],
  CANCELADA: [],
};

@Injectable()
export class RoomStateMachine {
  static canTransitionRoom(current: RoomState, next: RoomState): boolean {
    return ROOM_TRANSITIONS[current]?.includes(next) ?? false;
  }

  static canTransitionReservation(current: ReservationStatus, next: ReservationStatus): boolean {
    return RESERVATION_TRANSITIONS[current]?.includes(next) ?? false;
  }

  static getNextRoomState(reservationStatus: ReservationStatus): RoomState {
    switch (reservationStatus) {
      case 'CHECKED_IN':
        return 'OCUPADA';
      case 'CHECKED_OUT':
        return 'LIMPIEZA';
      case 'CANCELADA':
        return 'DISPONIBLE';
      default:
        return 'DISPONIBLE';
    }
  }

  static getNextReservationStatus(roomState: RoomState, currentReservationStatus: ReservationStatus): ReservationStatus {
    // Check-in: CONFIRMADA -> CHECKED_IN
    if (roomState === 'OCUPADA' && currentReservationStatus === 'CONFIRMADA') {
      return 'CHECKED_IN';
    }
    // Check-out: CHECKED_IN -> CHECKED_OUT
    if (roomState === 'LIMPIEZA' && currentReservationStatus === 'CHECKED_IN') {
      return 'CHECKED_OUT';
    }
    // Cancel: CONFIRMADA -> CANCELADA
    if (roomState === 'DISPONIBLE' && currentReservationStatus === 'CONFIRMADA') {
      return 'CANCELADA';
    }
    return currentReservationStatus;
  }

  static validateRoomTransition(current: RoomState, next: RoomState): void {
    if (!this.canTransitionRoom(current, next)) {
      throw new BadRequestException(
        `Transición de habitación inválida: ${current} -> ${next}. Permitidas: ${ROOM_TRANSITIONS[current]?.join(', ') || 'ninguna'}`,
      );
    }
  }

  static validateReservationTransition(current: ReservationStatus, next: ReservationStatus): void {
    if (!this.canTransitionReservation(current, next)) {
      throw new BadRequestException(
        `Transición de reserva inválida: ${current} -> ${next}. Permitidas: ${RESERVATION_TRANSITIONS[current]?.join(', ') || 'ninguna'}`,
      );
    }
  }
}

export const RoomStateMachineUtil = {
  /**
   * Aplica la transición de habitación en la DB dentro de una transacción.
   * Debe llamarse dentro de prisma.$transaction().
   */
  async applyRoomTransition(
    prisma: Prisma.TransactionClient,
    roomId: string,
    nextState: RoomState,
  ) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { status: true },
    });
    if (!room) {
      throw new BadRequestException('Habitación no encontrada');
    }
    this.validateRoomTransition(room.status as RoomState, nextState);
    return prisma.room.update({
      where: { id: roomId },
      data: { status: nextState },
    });
  },

  /**
   * Aplica la transición de reserva en la DB dentro de una transacción.
   * Debe llamarse dentro de prisma.$transaction().
   */
  async applyReservationTransition(
    prisma: Prisma.TransactionClient,
    reservationId: string,
    nextStatus: ReservationStatus,
  ) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { status: true },
    });
    if (!reservation) {
      throw new BadRequestException('Reserva no encontrada');
    }
    this.validateReservationTransition(reservation.status as ReservationStatus, nextStatus);
    return prisma.reservation.update({
      where: { id: reservationId },
      data: { status: nextStatus },
    });
  },
};