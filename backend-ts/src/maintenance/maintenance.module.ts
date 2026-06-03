import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { MaintenanceCron } from './maintenance.cron';

@Module({
  imports: [SupabaseModule, AuditModule],
  providers: [MaintenanceCron],
})
export class MaintenanceModule {}
