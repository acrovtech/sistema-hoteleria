import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { CurrentUser } from '../../auth/jwt.strategy';
import {
  resolveCreateHotelId,
  resolveTenantHotelId,
} from '../../common/tenant/tenant.helper';
import { RoomStateMachine, RoomStateMachineUtil } from './state-machine/room-state-machine';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ListReservationsQueryDto } from './dto/list-reservations-query.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';

const reservationSelect = {
  id: true,
  checkIn: true,
  checkOut: true,
  status: true,
  total: true,
  origin: true,
  notes: true,
  createdAt: true,
  hotelId: true,
  roomId: true,
  clientId: true,
  room: { select: { id: true, number: true, status: true, type: { select: { id: true, name: true } } } },
  client: { select: { id: true, name: true, dni: true, email: true, phone: true } },
} as const;

@Injectable()
export class ReservationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: CurrentUser, query: ListReservationsQueryDto) {
    const hotelId = resolveTenantHotelId(user, query.hotelId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ReservationWhereInput = {
      ...(hotelId ? { hotelId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.roomId ? { roomId: query.roomId } : {}),
      ...(query.checkInFrom || query.checkInTo
        ? {
            checkIn: {
              ...(query.checkInFrom ? { gte: new Date(query.checkInFrom) } : {}),
              ...(query.checkInTo ? { lte: new Date(query.checkInTo) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { checkIn: 'asc' },
        select: reservationSelect,
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return {
      data: data.map((r) => ({ ...r, total: Number(r.total) })),
      total,
      page,
      limit,
    };
  }

  async create(dto: CreateReservationDto, user: CurrentUser) {
    const hotelId = resolveCreateHotelId(user, dto.hotelId);

    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);
    if (checkOut <= checkIn) {
      throw new BadRequestException('checkOut debe ser posterior a checkIn');
    }

    // Transacción SERIALIZABLE: el check de solape y la creación son atómicos.
    // Si dos requests concurrentes intentan la misma habitación/fechas, una
    // falla con P2034 y se traduce a 409 para que el cliente reintente.
    try {
      const created = await this.prisma.$transaction(
        async (tx) => {
          // Validar room existe y pertenece al hotel
          const room = await tx.room.findUnique({
            where: { id: dto.roomId },
            select: { id: true, hotelId: true, status: true, typeId: true },
          });
          if (!room || (hotelId && room.hotelId !== hotelId)) {
            throw new NotFoundException('Habitación no encontrada en este hotel');
          }

          // Validar client existe y pertenece al hotel
          const client = await tx.client.findUnique({
            where: { id: dto.clientId },
            select: { id: true, hotelId: true },
          });
          if (!client || (hotelId && client.hotelId !== hotelId)) {
            throw new NotFoundException('Cliente no encontrado en este hotel');
          }

          // Verificar disponibilidad (overlap check)
          const overlapping = await tx.reservation.findFirst({
            where: {
              roomId: dto.roomId,
              status: { in: ['CONFIRMADA', 'CHECKED_IN'] },
              checkIn: { lt: checkOut },
              checkOut: { gt: checkIn },
            },
            select: { id: true },
          });
          if (overlapping) {
            throw new ConflictException('Habitación no disponible en esas fechas');
          }

          // Calcular total si no viene
          let total = dto.total;
          if (!total) {
            const roomType = await tx.roomType.findUnique({
              where: { id: room.typeId },
              select: { priceBase: true },
            });
            if (!roomType) {
              throw new NotFoundException('Tipo de habitación no encontrado');
            }
            const nights = Math.ceil(
              (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
            );
            total = nights * Number(roomType.priceBase);
          }

          return tx.reservation.create({
            data: {
              checkIn,
              checkOut,
              status: 'CONFIRMADA',
              total,
              origin: 'ADMIN',
              notes: dto.notes ?? null,
              hotelId,
              roomId: dto.roomId,
              clientId: dto.clientId,
            },
            select: {
              id: true,
              checkIn: true,
              checkOut: true,
              status: true,
              total: true,
              origin: true,
              notes: true,
              createdAt: true,
              hotelId: true,
              roomId: true,
              clientId: true,
            },
          });
        },
        { isolationLevel: 'Serializable', maxWait: 5000, timeout: 15000 },
      );
      return { ...created, total: Number(created.total) };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'Conflicto de concurrencia al reservar, reintente la operación',
        );
      }
      throw error;
    }
  }

  async findOne(id: string, user: CurrentUser) {
    const hotelId = resolveTenantHotelId(user);
    const where = { id, ...(hotelId ? { hotelId } : {}) };

    const reservation = await this.prisma.reservation.findUnique({
      where,
      select: reservationSelect,
    });
    if (!reservation) {
      throw new NotFoundException('Reserva no encontrada');
    }
    return { ...reservation, total: Number(reservation.total) };
  }

  async update(id: string, dto: UpdateReservationDto, user: CurrentUser) {
    const hotelId = resolveTenantHotelId(user);
    const where = { id, ...(hotelId ? { hotelId } : {}) };

    const existing = await this.prisma.reservation.findUnique({
      where,
      select: { id: true, status: true, checkIn: true, checkOut: true, roomId: true },
    });
    if (!existing) {
      throw new NotFoundException('Reserva no encontrada');
    }

    // Solo permitir update si CONFIRMADA
    if (existing.status !== 'CONFIRMADA') {
      throw new BadRequestException('Solo se puede modificar reserva en estado CONFIRMADA');
    }

    const checkIn = dto.checkIn ? new Date(dto.checkIn) : existing.checkIn;
    const checkOut = dto.checkOut ? new Date(dto.checkOut) : existing.checkOut;
    if (checkOut <= checkIn) {
      throw new BadRequestException('checkOut debe ser posterior a checkIn');
    }

    // Verificar overlap si cambian fechas
    if (dto.checkIn || dto.checkOut) {
      const overlapping = await this.prisma.reservation.findFirst({
        where: {
          roomId: existing.roomId,
          status: { in: ['CONFIRMADA', 'CHECKED_IN'] },
          checkIn: { lt: checkOut },
          checkOut: { gt: checkIn },
          id: { not: id },
        },
        select: { id: true },
      });
      if (overlapping) {
        throw new ConflictException('Habitación no disponible en las nuevas fechas');
      }
    }

    return this.prisma.reservation.update({
      where: { id },
      data: {
        ...(dto.checkIn !== undefined ? { checkIn } : {}),
        ...(dto.checkOut !== undefined ? { checkOut } : {}),
        ...(dto.total !== undefined ? { total: dto.total } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      select: {
        id: true,
        checkIn: true,
        checkOut: true,
        status: true,
        total: true,
        origin: true,
        notes: true,
        createdAt: true,
        hotelId: true,
        roomId: true,
        clientId: true,
      },
    }).then((r) => ({ ...r, total: Number(r.total) }));
  }

  async checkIn(id: string, user: CurrentUser) {
    const hotelId = resolveTenantHotelId(user);
    const where = { id, ...(hotelId ? { hotelId } : {}) };

    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where,
        select: { id: true, status: true, roomId: true, checkIn: true, checkOut: true },
      });
      if (!reservation) {
        throw new NotFoundException('Reserva no encontrada');
      }
      if (reservation.status !== 'CONFIRMADA') {
        throw new BadRequestException('Solo se puede hacer check-in de reserva CONFIRMADA');
      }

      const now = new Date();
      const checkInDate = new Date(reservation.checkIn);
      const checkOutDate = new Date(reservation.checkOut);
      if (now < checkInDate) {
        throw new BadRequestException('No se puede hacer check-in antes de la fecha de entrada');
      }
      if (now > checkOutDate) {
        throw new BadRequestException('Fecha de check-in expirada');
      }

      const room = await tx.room.findUnique({
        where: { id: reservation.roomId },
        select: { id: true, status: true, hotelId: true },
      });
      if (!room || (hotelId && room.hotelId !== hotelId)) {
        throw new NotFoundException('Habitación no encontrada');
      }
      if (room.status !== 'DISPONIBLE') {
        throw new ConflictException(`Habitación no disponible (estado: ${room.status})`);
      }

      // Transición atómica
      await RoomStateMachineUtil.applyRoomTransition(tx, reservation.roomId, 'OCUPADA');
      await RoomStateMachineUtil.applyReservationTransition(tx, reservation.id, 'CHECKED_IN');

      return tx.reservation.update({
        where: { id },
        data: { status: 'CHECKED_IN' },
        select: { id: true, status: true, checkIn: true },
      });
    });
  }

  async checkOut(id: string, user: CurrentUser) {
    const hotelId = resolveTenantHotelId(user);
    const where = { id, ...(hotelId ? { hotelId } : {}) };

    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where,
        select: { id: true, status: true, roomId: true },
      });
      if (!reservation) {
        throw new NotFoundException('Reserva no encontrada');
      }
      if (reservation.status !== 'CHECKED_IN') {
        throw new BadRequestException('Solo se puede hacer check-out de reserva CHECKED_IN');
      }

      const room = await tx.room.findUnique({
        where: { id: reservation.roomId },
        select: { id: true, status: true, hotelId: true },
      });
      if (!room || (hotelId && room.hotelId !== hotelId)) {
        throw new NotFoundException('Habitación no encontrada');
      }
      if (room.status !== 'OCUPADA') {
        throw new ConflictException(`Habitación no está ocupada (estado: ${room.status})`);
      }

      // Transición atómica
      await RoomStateMachineUtil.applyRoomTransition(tx, reservation.roomId, 'LIMPIEZA');
      await RoomStateMachineUtil.applyReservationTransition(tx, reservation.id, 'CHECKED_OUT');

      return tx.reservation.update({
        where: { id },
        data: { status: 'CHECKED_OUT' },
        select: { id: true, status: true, checkOut: true },
      });
    });
  }

  async cancel(id: string, user: CurrentUser) {
    const hotelId = resolveTenantHotelId(user);
    const where = { id, ...(hotelId ? { hotelId } : {}) };

    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where,
        select: { id: true, status: true, roomId: true },
      });
      if (!reservation) {
        throw new NotFoundException('Reserva no encontrada');
      }
      if (reservation.status !== 'CONFIRMADA') {
        throw new BadRequestException('Solo se puede cancelar reserva CONFIRMADA');
      }

      // Liberar habitación
      await RoomStateMachineUtil.applyRoomTransition(tx, reservation.roomId, 'DISPONIBLE');
      await RoomStateMachineUtil.applyReservationTransition(tx, reservation.id, 'CANCELADA');

      return tx.reservation.update({
        where: { id },
        data: { status: 'CANCELADA' },
        select: { id: true, status: true },
      });
    });
  }

  async calendar(user: CurrentUser, query: CalendarQueryDto) {
    const hotelId = resolveTenantHotelId(user, query.hotelId);
    if (!hotelId) {
      throw new BadRequestException('SUPERADMIN debe especificar hotelId');
    }

    const from = new Date(query.from);
    const to = new Date(query.to);
    if (to <= from) {
      throw new BadRequestException('to debe ser posterior a from');
    }

    // Obtener habitaciones del hotel
    const rooms = await this.prisma.room.findMany({
      where: { hotelId },
      select: { id: true, number: true, status: true },
      orderBy: { number: 'asc' },
    });

    // Obtener reservas en rango
    const reservations = await this.prisma.reservation.findMany({
      where: {
        hotelId,
        status: { in: ['CONFIRMADA', 'CHECKED_IN'] },
        checkIn: { lt: to },
        checkOut: { gt: from },
      },
      select: {
        id: true,
        checkIn: true,
        checkOut: true,
        status: true,
        roomId: true,
        clientId: true,
      },
    });

    // Obtener clientes para los nombres
    const clientIds = [...new Set(reservations.map((r) => r.clientId))];
    const clients = await this.prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, name: true },
    });
    const clientMap = new Map(clients.map((c) => [c.id, c.name]));

    // Construir matriz: habitación -> día -> reserva
    const days: { date: string; reservations: any[] }[] = [];
    const current = new Date(from);
    while (current <= to) {
      const dayStr = current.toISOString().split('T')[0];
      const dayReservations = reservations.filter(
        (r) => new Date(r.checkIn) <= current && new Date(r.checkOut) > current,
      ).map((r) => ({
        id: r.id,
        roomId: r.roomId,
        status: r.status,
        clientName: clientMap.get(r.clientId),
      }));
      days.push({ date: dayStr, reservations: dayReservations });
      current.setDate(current.getDate() + 1);
    }

    return {
      hotelId,
      from: query.from,
      to: query.to,
      rooms: rooms.map((r) => ({
        id: r.id,
        number: r.number,
        status: r.status,
      })),
      days,
    };
  }
}