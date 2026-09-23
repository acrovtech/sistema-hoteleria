import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { Plan } from '@prisma/client';

export class CreateHotelDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug inválido' })
  slug: string;

  @IsOptional()
  @IsEnum(Plan)
  plan?: Plan;
}
