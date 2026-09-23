import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LicenseService } from './license.service';

@Module({
  imports: [PrismaModule],
  providers: [LicenseService],
  exports: [LicenseService],
})
export class LicenseModule {}
