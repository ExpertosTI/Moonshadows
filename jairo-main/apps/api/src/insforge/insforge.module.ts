import { Module } from '@nestjs/common';
import { InsforgeController } from './insforge.controller';
import { InsforgeService } from './insforge.service';

@Module({
  controllers: [InsforgeController],
  providers: [InsforgeService]
})
export class InsforgeModule {}
