import { Module } from '@nestjs/common';
import { LicenseModule } from '../../core/license/license.module';
import { BookingController } from './booking.controller';

@Module({ imports: [LicenseModule], controllers: [BookingController] })
export class PublicBookingModule {}
