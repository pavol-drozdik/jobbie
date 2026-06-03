import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuditService } from '../audit/audit.service';
import { AdminNotificationsController } from './admin-notifications.controller';
import { AdminNotificationsService } from './admin-notifications.service';

@Module({
  imports: [AdminAuthModule, SupabaseModule],
  controllers: [AdminNotificationsController],
  providers: [AdminNotificationsService, AuditService],
})
export class AdminNotificationsModule {}
