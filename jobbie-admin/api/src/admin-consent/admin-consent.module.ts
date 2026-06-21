import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminConsentCookieLogController } from './admin-consent-cookie-log.controller';

@Module({
  imports: [AdminAuthModule, SupabaseModule],
  controllers: [AdminConsentCookieLogController],
})
export class AdminConsentModule {}
