import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class CreateReservationDto {
  @IsNotEmpty()
  @IsString()
  clientId: string;

  @IsNotEmpty()
  @IsString()
  roomId: string;

  @IsNotEmpty()
  @IsDateString()
  checkIn: string;

  @IsNotEmpty()
  @IsDateString()
  checkOut: string;

  @IsOptional()
  @IsPositive()
  total?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  hotelId?: string;
}