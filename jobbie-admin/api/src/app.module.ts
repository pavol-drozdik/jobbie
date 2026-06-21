import 'dotenv/config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { SupabaseModule } from './supabase/supabase.module';
import { AdminAnalyticsModule } from './admin-analytics/admin-analytics.module';
import { AdminAuditModule } from './audit/admin-audit.module';
import { AdminNotificationsModule } from './admin-notifications/admin-notifications.module';
import { AdminBlogModule } from './admin-blog/admin-blog.module';
import { AdminStorageModule } from './admin-storage/admin-storage.module';
import { AdminOverviewModule } from './admin-overview/admin-overview.module';
import { AdminContentModule } from './admin-content/admin-content.module';
import { AdminConsentModule } from './admin-consent/admin-consent.module';
import { AdminInfrastructureModule } from './admin-infrastructure/admin-infrastructure.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.DOTENV_CONFIG_PATH?.trim() || '.env',
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 300,
      },
    ]),
    SupabaseModule,
    AdminAnalyticsModule,
    AdminAuditModule,
    AdminNotificationsModule,
    AdminBlogModule,
    AdminStorageModule,
    AdminOverviewModule,
    AdminContentModule,
    AdminConsentModule,
    AdminInfrastructureModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
