import {
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
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ListRoomsQueryDto } from './dto/list-rooms-query.dto';

const roomSelect = {
  id: true,
  number: true,
  status: true,
  hotelId: true,
  typeId: true,
  type: { select: { id: true, name: true } },
} as const;

@Injectable()
export class RoomService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: CurrentUser, query: ListRoomsQueryDto) {
    const hotelId = resolveTenantHotelId(user, query.hotelId);

    const where: Prisma.RoomWhereInput = {
      ...(hotelId ? { hotelId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.typeId ? { typeId: query.typeId } : {}),
    };

    return this.prisma.room.findMany({
      where,
      select: roomSelect,
      orderBy: { number: 'asc' },
    });
  }

  async create(dto: CreateRoomDto, user: CurrentUser) {
    const hotelId = resolveCreateHotelId(user, dto.hotelId);

    const type = await this.prisma.roomType.findUnique({
      where: { id: dto.typeId },
      select: { id: true, hotelId: true },
    });
    if (!type || type.hotelId !== hotelId) {
      throw new NotFoundException('Tipo de habitación no encontrado para este hotel');
    }

    const existing = await this.prisma.room.findFirst({
      where: { hotelId, number: dto.number },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Número de habitación ya existe en este hotel');
    }

    try {
      return await this.prisma.room.create({
        data: {
          number: dto.number,
          typeId: dto.typeId,
          status: dto.status ?? 'DISPONIBLE',
          hotelId,
        },
        select: roomSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Número de habitación ya existe en este hotel');
        }
        if (error.code === 'P2003') {
          throw new NotFoundException('Tipo de habitación no encontrado');
        }
      }
      throw error;
    }
  }

  async findOne(id: string, user: CurrentUser) {
    const hotelId = resolveTenantHotelId(user);
    const where = { id, ...(hotelId ? { hotelId } : {}) };

    const room = await this.prisma.room.findUnique({
      where,
      select: roomSelect,
    });
    if (!room) {
      throw new NotFoundException('Habitación no encontrada');
    }
    return room;
  }

  async update(id: string, dto: UpdateRoomDto, user: CurrentUser) {
    const hotelId = resolveTenantHotelId(user);
    const where = { id, ...(hotelId ? { hotelId } : {}) };

    const room = await this.prisma.room.findUnique({
      where,
      select: { id: true, hotelId: true, number: true, typeId: true },
    });
    if (!room) {
      throw new NotFoundException('Habitación no encontrada');
    }

    if (dto.typeId && dto.typeId !== room.typeId) {
      const type = await this.prisma.roomType.findUnique({
        where: { id: dto.typeId },
        select: { id: true, hotelId: true },
      });
      if (!type || type.hotelId !== room.hotelId) {
        throw new NotFoundException('Tipo de habitación no encontrado para este hotel');
      }
    }

    if (dto.number && dto.number !== room.number) {
      const existing = await this.prisma.room.findFirst({
        where: { hotelId: room.hotelId, number: dto.number, id: { not: id } },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('Número de habitación ya existe en este hotel');
      }
    }

    try {
      return await this.prisma.room.update({
        where: { id },
        data: {
          ...(dto.number !== undefined ? { number: dto.number } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.typeId !== undefined ? { typeId: dto.typeId } : {}),
        },
        select: roomSelect,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Número de habitación ya existe en este hotel');
        }
      }
      throw error;
    }
  }

  async remove(id: string, user: CurrentUser) {
    const hotelId = resolveTenantHotelId(user);
    const where = { id, ...(hotelId ? { hotelId } : {}) };

    const room = await this.prisma.room.findUnique({
      where,
      select: { id: true },
    });
    if (!room) {
      throw new NotFoundException('Habitación no encontrada');
    }

    const activeReservations = await this.prisma.reservation.count({
      where: { roomId: id, status: { not: 'CANCELADA' } },
    });
    if (activeReservations > 0) {
      throw new ConflictException('Habitación tiene reservas activas');
    }

    await this.prisma.room.delete({ where: { id } });
    return { success: true };
  }
}
