import { Module } from '@nestjs/common';
import { RoomTypeController } from './room-type.controller';
import { RoomTypeService } from './room-type.service';

@Module({
  controllers: [RoomTypeController],
  providers: [RoomTypeService],
})
export class RoomTypeModule {}
