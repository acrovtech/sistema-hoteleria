import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HotelModule } from './core/hotel/hotel.module';
import { LicenseModule } from './core/license/license.module';
import { RoomTypeModule } from './core/room-type/room-type.module';
import { RoomModule } from './core/room/room.module';
import { ClientModule } from './core/client/client.module';
import { ReservationModule } from './core/reservation/reservation.module';
import { PublicBookingModule } from './public/booking/booking.module';
import { HealthController } from './health/health.controller';

const publicModules = process.env.ENABLE_PUBLIC_WEBSITE === 'true' ? [PublicBookingModule] : [];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    HotelModule,
    LicenseModule,
    RoomTypeModule,
    RoomModule,
    ClientModule,
    ReservationModule,
    ...publicModules,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
