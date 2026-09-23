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
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ListClientsQueryDto } from './dto/list-clients-query.dto';

@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL, Role.RECEPCION)
  findAll(@Query() query: ListClientsQueryDto, @CurrentUser() user: CurrentUserType) {
    return this.clientService.findAll(user, query);
  }

  @Post()
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL)
  create(@Body() dto: CreateClientDto, @CurrentUser() user: CurrentUserType) {
    return this.clientService.create(dto, user);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL, Role.RECEPCION)
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.clientService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.clientService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN_HOTEL)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserType) {
    return this.clientService.remove(id, user);
  }
}
