import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { MaintenanceCron } from './maintenance.cron';

@Module({
  imports: [SupabaseModule, AuditModule, PromotionsModule],
  providers: [MaintenanceCron],
})
export class MaintenanceModule {}
