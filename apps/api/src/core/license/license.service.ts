import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Plan } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LicenseService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Plan efectivo de un hotel: última licencia vigente si existe,
   * si no el plan del hotel. Las expiradas se ignoran.
   */
  async getEffectivePlan(hotelId: string): Promise<Plan> {
    const license = await this.prisma.license.findFirst({
      where: {
        hotelId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
      select: { plan: true },
    });
    if (license) {
      return license.plan;
    }
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { plan: true },
    });
    if (!hotel) {
      throw new NotFoundException('Hotel no encontrado');
    }
    return hotel.plan;
  }

  async assertPublicBookingAllowed(hotelId: string): Promise<void> {
    const plan = await this.getEffectivePlan(hotelId);
    if (plan !== Plan.FULL) {
      throw new ForbiddenException('Hotel sin web pública habilitada (plan ADMIN_ONLY)');
    }
  }
}
