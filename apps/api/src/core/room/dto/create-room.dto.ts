import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RoomStatus } from '@prisma/client';

export const ROOM_STATUSES = Object.values(RoomStatus);

export class CreateRoomDto {
  @IsNotEmpty()
  @IsString()
  number: string;

  @IsNotEmpty()
  @IsString()
  typeId: string;

  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @IsOptional()
  @IsString()
  hotelId?: string;
}
