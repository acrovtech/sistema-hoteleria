import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateRoomTypeDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  priceBase: number;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  hotelId?: string;
}
