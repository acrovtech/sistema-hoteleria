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
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';

const clientSelect = {
  id: true,
  dni: true,
  name: true,
  phone: true,
  email: true,
  hotelId: true,
} as const;

@Injectable()
export class ClientService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: CurrentUser, query: ListClientsQueryDto) {
    const hotelId = resolveTenantHotelId(user, query.hotelId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ClientWhereInput = {
      ...(hotelId ? { hotelId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { dni: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
        select: clientSelect,
      }),
      this.prisma.client.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async create(dto: CreateClientDto, user: CurrentUser) {
    const hotelId = resolveCreateHotelId(user, dto.hotelId);
    await this.assertHotelExists(hotelId);

    if (dto.dni) {
      const existing = await this.prisma.client.findFirst({
        where: { hotelId, dni: dto.dni },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('DNI ya registrado en este hotel');
      }
    }

    return this.prisma.client.create({
      data: {
        name: dto.name,
        dni: dto.dni,
        phone: dto.phone,
        email: dto.email,
        hotelId,
      },
      select: clientSelect,
    });
  }

  async findOne(id: string, user: CurrentUser) {
    const hotelId = resolveTenantHotelId(user);
    const where = { id, ...(hotelId ? { hotelId } : {}) };

    const client = await this.prisma.client.findUnique({
      where,
      select: clientSelect,
    });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return client;
  }

  async update(id: string, dto: UpdateClientDto, user: CurrentUser) {
    const hotelId = resolveTenantHotelId(user);
    const where = { id, ...(hotelId ? { hotelId } : {}) };

    const client = await this.prisma.client.findUnique({
      where,
      select: { id: true, hotelId: true, dni: true },
    });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    if (dto.dni && dto.dni !== client.dni) {
      const existing = await this.prisma.client.findFirst({
        where: { hotelId: client.hotelId, dni: dto.dni, id: { not: id } },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('DNI ya registrado en este hotel');
      }
    }

    return this.prisma.client.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.dni !== undefined ? { dni: dto.dni } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
      },
      select: clientSelect,
    });
  }

  async remove(id: string, user: CurrentUser) {
    const hotelId = resolveTenantHotelId(user);
    const where = { id, ...(hotelId ? { hotelId } : {}) };

    const client = await this.prisma.client.findUnique({
      where,
      select: { id: true },
    });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const activeReservations = await this.prisma.reservation.count({
      where: { clientId: id, status: { not: 'CANCELADA' } },
    });
    if (activeReservations > 0) {
      throw new ConflictException('Cliente tiene reservas activas');
    }

    await this.prisma.client.delete({ where: { id } });
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
