import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../auth/jwt.strategy';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ListReservationsQueryDto } from './dto/list-reservations-query.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';

@Controller('reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL, Role.RECEPCION)
  findAll(@Query() query: ListReservationsQueryDto, @CurrentUser() user: CurrentUserType) {
    return this.reservationService.findAll(user, query);
  }

  @Get('calendar')
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL, Role.RECEPCION)
  calendar(@Query() query: CalendarQueryDto, @CurrentUser() user: CurrentUserType) {
    return this.reservationService.calendar(user, query);
  }

  @Post()
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL, Role.RECEPCION)
  create(@Body() dto: CreateReservationDto, @CurrentUser() user: CurrentUserType) {
    return this.reservationService.create(dto, user);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL, Role.RECEPCION)
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.reservationService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL, Role.RECEPCION)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReservationDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.reservationService.update(id, dto, user);
  }

  @Post(':id/check-in')
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL, Role.RECEPCION)
  checkIn(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.reservationService.checkIn(id, user);
  }

  @Post(':id/check-out')
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL, Role.RECEPCION)
  checkOut(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.reservationService.checkOut(id, user);
  }

  @Post(':id/cancel')
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL, Role.RECEPCION)
  cancel(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.reservationService.cancel(id, user);
  }
}