import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminOverviewController } from './admin-overview.controller';
import { AdminOverviewService } from './admin-overview.service';

@Module({
  imports: [AdminAuthModule, SupabaseModule],
  controllers: [AdminOverviewController],
  providers: [AdminOverviewService],
  exports: [AdminOverviewService],
})
export class AdminOverviewModule {}
