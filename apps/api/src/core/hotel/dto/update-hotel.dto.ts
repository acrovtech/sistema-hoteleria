import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { Plan } from '@prisma/client';

export class UpdateHotelDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug inválido' })
  slug?: string;

  @IsOptional()
  @IsEnum(Plan)
  plan?: Plan;
}
