import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../auth/jwt.strategy';
import { HotelService } from './hotel.service';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';

@Controller('hotels')
export class HotelController {
  constructor(private readonly hotelService: HotelService) {}

  @Get()
  @Roles(Role.SUPERADMIN)
  findAll() {
    return this.hotelService.findAll();
  }

  @Post()
  @Roles(Role.SUPERADMIN)
  create(@Body() dto: CreateHotelDto) {
    return this.hotelService.create(dto);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL)
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.hotelService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateHotelDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.hotelService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN)
  remove(@Param('id') id: string) {
    return this.hotelService.remove(id);
  }
}
