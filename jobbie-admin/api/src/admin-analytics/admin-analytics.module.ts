import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { ExternalAnalyticsService } from './external/external-analytics.service';

@Module({
  imports: [AdminAuthModule, SupabaseModule],
  controllers: [AdminAnalyticsController],
  providers: [AdminAnalyticsService, ExternalAnalyticsService],
})
export class AdminAnalyticsModule {}
