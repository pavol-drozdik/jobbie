import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SearchModule } from '../search/search.module';
import { SkRpoLookupService } from '../registry/sk-rpo-lookup.service';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  imports: [AuthModule, SearchModule],
  controllers: [LocationsController],
  providers: [LocationsService, SkRpoLookupService],
})
export class LocationsModule {}
