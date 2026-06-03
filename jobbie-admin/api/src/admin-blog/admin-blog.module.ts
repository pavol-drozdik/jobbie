import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { AuditService } from '../audit/audit.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminBlogController } from './admin-blog.controller';
import { AdminBlogService } from './admin-blog.service';

@Module({
  imports: [AdminAuthModule, SupabaseModule],
  controllers: [AdminBlogController],
  providers: [AdminBlogService, AuditService],
})
export class AdminBlogModule {}
