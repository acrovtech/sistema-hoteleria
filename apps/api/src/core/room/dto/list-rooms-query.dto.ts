import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RoomStatus } from '@prisma/client';

export class ListRoomsQueryDto {
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @IsOptional()
  @IsString()
  typeId?: string;

  @IsOptional()
  @IsString()
  hotelId?: string;
}
