import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RoomStatus } from '@prisma/client';

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @IsOptional()
  @IsString()
  typeId?: string;
}
