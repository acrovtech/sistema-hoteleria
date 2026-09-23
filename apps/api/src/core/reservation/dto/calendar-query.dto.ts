import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CalendarQueryDto {
  @IsNotEmpty()
  @IsDateString()
  from: string;

  @IsNotEmpty()
  @IsDateString()
  to: string;

  @IsOptional()
  @IsString()
  hotelId?: string;
}