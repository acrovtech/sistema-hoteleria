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
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { ListRoomsQueryDto } from './dto/list-rooms-query.dto';

@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL, Role.RECEPCION, Role.LIMPIEZA)
  findAll(@Query() query: ListRoomsQueryDto, @CurrentUser() user: CurrentUserType) {
    return this.roomService.findAll(user, query);
  }

  @Post()
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL)
  create(@Body() dto: CreateRoomDto, @CurrentUser() user: CurrentUserType) {
    return this.roomService.create(dto, user);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL, Role.RECEPCION, Role.LIMPIEZA)
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.roomService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoomDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.roomService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.roomService.remove(id, user);
  }
}
