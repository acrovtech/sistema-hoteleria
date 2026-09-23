import { IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateReservationDto {
  @IsOptional()
  @IsString()
  checkIn?: string;

  @IsOptional()
  @IsString()
  checkOut?: string;

  @IsOptional()
  @IsPositive()
  total?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}