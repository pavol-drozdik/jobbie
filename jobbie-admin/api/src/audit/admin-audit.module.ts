import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuditService } from './audit.service';
import { AdminAuditController } from './admin-audit.controller';
import { AdminModerationController } from './admin-moderation.controller';
import { AdminModerationService } from './admin-moderation.service';
import { AdminUsersController } from '../auth/admin-users.controller';
import { AdminUsersService } from '../auth/admin-users.service';
import { AdminBillingService } from '../admin-billing/admin-billing.service';
import { AdminDataExportService } from '../admin-data-export/admin-data-export.service';
import { AdminAccountCloseService } from '../admin-account/admin-account-close.service';

@Module({
  imports: [AdminAuthModule, SupabaseModule],
  controllers: [
    AdminAuditController,
    AdminModerationController,
    AdminUsersController,
  ],
  providers: [
    AuditService,
    AdminModerationService,
    AdminUsersService,
    AdminBillingService,
    AdminDataExportService,
    AdminAccountCloseService,
  ],
})
export class AdminAuditModule {}
