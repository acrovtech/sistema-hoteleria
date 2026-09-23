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
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';

const roomTypeSelect = {
  id: true,
  name: true,
  priceBase: true,
  capacity: true,
  description: true,
  hotelId: true,
} as const;

@Injectable()
export class RoomTypeService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: CurrentUser, explicitHotelId?: string) {
    const hotelId = resolveTenantHotelId(user, explicitHotelId);
    const where = hotelId ? { hotelId } : {};

    const types = await this.prisma.roomType.findMany({
      where,
      select: {
        ...roomTypeSelect,
        _count: { select: { rooms: true } },
      },
      orderBy: { name: 'asc' },
    });

    return types.map((t) => ({
      id: t.id,
      name: t.name,
      priceBase: Number(t.priceBase),
      capacity: t.capacity,
      description: t.description,
      hotelId: t.hotelId,
      roomsCount: t._count.rooms,
    }));
  }

  async create(dto: CreateRoomTypeDto, user: CurrentUser) {
    const hotelId = resolveCreateHotelId(user, dto.hotelId);
    await this.assertHotelExists(hotelId);

    try {
      const created = await this.prisma.roomType.create({
        data: {
          name: dto.name,
          priceBase: dto.priceBase,
          capacity: dto.capacity,
          description: dto.description,
          hotelId,
        },
        select: roomTypeSelect,
      });
      return { ...created, priceBase: Number(created.priceBase) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new NotFoundException('Hotel no encontrado');
        }
        if (error.code === 'P2002') {
          throw new ConflictException('Registro duplicado');
        }
      }
      throw error;
    }
  }

  async findOne(id: string, user: CurrentUser) {
    const hotelId = resolveTenantHotelId(user);
    const where = { id, ...(hotelId ? { hotelId } : {}) };

    const type = await this.prisma.roomType.findUnique({
      where,
      select: {
        ...roomTypeSelect,
        _count: { select: { rooms: true } },
      },
    });
    if (!type) {
      throw new NotFoundException('Tipo de habitación no encontrado');
    }
    return {
      id: type.id,
      name: type.name,
      priceBase: Number(type.priceBase),
      capacity: type.capacity,
      description: type.description,
      hotelId: type.hotelId,
      roomsCount: type._count.rooms,
    };
  }

  async update(id: string, dto: UpdateRoomTypeDto, user: CurrentUser) {
    const hotelId = resolveTenantHotelId(user);
    const where = { id, ...(hotelId ? { hotelId } : {}) };

    const existing = await this.prisma.roomType.findUnique({
      where,
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Tipo de habitación no encontrado');
    }

    const updated = await this.prisma.roomType.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.priceBase !== undefined ? { priceBase: dto.priceBase } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
      select: roomTypeSelect,
    });
    return { ...updated, priceBase: Number(updated.priceBase) };
  }

  async remove(id: string, user: CurrentUser) {
    const hotelId = resolveTenantHotelId(user);
    const where = { id, ...(hotelId ? { hotelId } : {}) };

    const type = await this.prisma.roomType.findUnique({
      where,
      select: { id: true },
    });
    if (!type) {
      throw new NotFoundException('Tipo de habitación no encontrado');
    }

    const roomsCount = await this.prisma.room.count({ where: { typeId: id } });
    if (roomsCount > 0) {
      throw new ConflictException('Tipo de habitación tiene habitaciones asociadas');
    }

    await this.prisma.roomType.delete({ where: { id } });
    return { success: true };
  }

  private async assertHotelExists(hotelId: string) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { id: true },
    });
    if (!hotel) {
      throw new NotFoundException('Hotel no encontrado');
    }
  }
}
