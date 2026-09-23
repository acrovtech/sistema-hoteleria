import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ReservationStatus } from '@prisma/client';

export const RESERVATION_STATUSES = Object.values(ReservationStatus);

export class ListReservationsQueryDto {
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsString()
  checkInFrom?: string;

  @IsOptional()
  @IsString()
  checkInTo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  hotelId?: string;
}