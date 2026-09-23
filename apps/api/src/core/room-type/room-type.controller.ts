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
import { RoomTypeService } from './room-type.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';

@Controller('room-types')
export class RoomTypeController {
  constructor(private readonly roomTypeService: RoomTypeService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL)
  findAll(
    @Query('hotelId') hotelId: string | undefined,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.roomTypeService.findAll(user, hotelId);
  }

  @Post()
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL)
  create(@Body() dto: CreateRoomTypeDto, @CurrentUser() user: CurrentUserType) {
    return this.roomTypeService.create(dto, user);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL)
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.roomTypeService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoomTypeDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.roomTypeService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.roomTypeService.remove(id, user);
  }
}
