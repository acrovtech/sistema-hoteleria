import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Plan, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { CurrentUser } from '../../auth/jwt.strategy';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';

const hotelSelect = {
  id: true,
  name: true,
  slug: true,
  plan: true,
  createdAt: true,
} as const;

@Injectable()
export class HotelService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.hotel.findMany({
      select: hotelSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateHotelDto) {
    const existing = await this.prisma.hotel.findUnique({
      where: { slug: dto.slug },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Slug ya existe');
    }

    return this.prisma.hotel.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        plan: dto.plan ?? Plan.ADMIN_ONLY,
      },
      select: hotelSelect,
    });
  }

  async findOne(id: string, user: CurrentUser) {
    this.assertOwnership(id, user);

    const hotel = await this.prisma.hotel.findUnique({
      where: { id },
      select: hotelSelect,
    });
    if (!hotel) {
      throw new NotFoundException('Hotel no encontrado');
    }
    return hotel;
  }

  async update(id: string, dto: UpdateHotelDto, user: CurrentUser) {
    this.assertOwnership(id, user);

    if (dto.plan !== undefined && user.role !== Role.SUPERADMIN) {
      throw new ForbiddenException('Solo SUPERADMIN puede cambiar el plan del hotel');
    }

    const hotel = await this.prisma.hotel.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });
    if (!hotel) {
      throw new NotFoundException('Hotel no encontrado');
    }

    if (dto.slug && dto.slug !== hotel.slug) {
      const existing = await this.prisma.hotel.findUnique({
        where: { slug: dto.slug },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('Slug ya existe');
      }
    }

    return this.prisma.hotel.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.plan !== undefined ? { plan: dto.plan } : {}),
      },
      select: hotelSelect,
    });
  }

  async remove(id: string) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!hotel) {
      throw new NotFoundException('Hotel no encontrado');
    }

    const [users, roomTypes, rooms, clients, reservations, licenses] =
      await Promise.all([
        this.prisma.user.count({ where: { hotelId: id } }),
        this.prisma.roomType.count({ where: { hotelId: id } }),
        this.prisma.room.count({ where: { hotelId: id } }),
        this.prisma.client.count({ where: { hotelId: id } }),
        this.prisma.reservation.count({ where: { hotelId: id } }),
        this.prisma.license.count({ where: { hotelId: id } }),
      ]);

    const parts: string[] = [];
    if (users > 0) parts.push(`${users} usuarios`);
    if (roomTypes > 0) parts.push(`${roomTypes} tipos de habitación`);
    if (rooms > 0) parts.push(`${rooms} habitaciones`);
    if (clients > 0) parts.push(`${clients} clientes`);
    if (reservations > 0) parts.push(`${reservations} reservas`);
    if (licenses > 0) parts.push(`${licenses} licencias`);

    if (parts.length > 0) {
      throw new ConflictException(`Hotel tiene datos asociados: ${parts.join(', ')}`);
    }

    await this.prisma.hotel.delete({ where: { id } });
    return { success: true };
  }

  private assertOwnership(id: string, user: CurrentUser) {
    if (user.role === Role.SUPERADMIN) {
      return;
    }
    if (!user.hotelId) {
      throw new ForbiddenException('Usuario sin hotel asignado');
    }
    if (user.hotelId !== id) {
      throw new ForbiddenException('No puede acceder a otro hotel');
    }
  }
}
