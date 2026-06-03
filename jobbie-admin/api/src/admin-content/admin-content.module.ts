import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuditService } from '../audit/audit.service';
import { AdminContentController } from './admin-content.controller';
import { AdminContentService } from './admin-content.service';

@Module({
  imports: [AdminAuthModule, SupabaseModule],
  controllers: [AdminContentController],
  providers: [AdminContentService, AuditService],
})
export class AdminContentModule {}
