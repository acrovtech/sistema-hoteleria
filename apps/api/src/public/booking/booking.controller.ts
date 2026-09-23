import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { LicenseService } from '../../core/license/license.service';

@Controller('public/booking')
export class BookingController {
  constructor(private readonly licenses: LicenseService) {}

  @Public()
  @Get('availability')
  async availability(@Query('hotelId') hotelId?: string) {
    if (process.env.ENABLE_PUBLIC_WEBSITE !== 'true') {
      throw new ForbiddenException('Módulo web no habilitado en plan ADMIN_ONLY');
    }
    if (hotelId) {
      await this.licenses.assertPublicBookingAllowed(hotelId);
    }
    return { available: true };
  }
}
