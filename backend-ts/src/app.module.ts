import 'dotenv/config';
import { Module, ExecutionContext } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { ProfilesModule } from './profiles/profiles.module';
import { PlansModule } from './plans/plans.module';
import { JobsModule } from './jobs/jobs.module';
import { CompanyAdsModule } from './company-ads/company-ads.module';
import { ApplicationsModule } from './applications/applications.module';
import { PaymentsModule } from './payments/payments.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SearchModule } from './search/search.module';
import { SavedSearchesModule } from './saved-searches/saved-searches.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AuditModule } from './audit/audit.module';
import { SentryGlobalFilter } from './filters/sentry-global.filter';
import { RedisModule } from './redis/redis.module';
import { MetricsModule } from './metrics/metrics.module';
import { EmailModule } from './email/email.module';
import { LocationsModule } from './locations/locations.module';
import { SavedModule } from './saved/saved.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { PricingInquiriesModule } from './pricing-inquiries/pricing-inquiries.module';
import { BlogModule } from './blog/blog.module';
import { SeoModule } from './seo/seo.module';
import { CvModule } from './cv/cv.module';
import { JobAlertsModule } from './job-alerts/job-alerts.module';
import { BillingModule } from './billing/billing.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { StorageModule } from './storage/storage.module';
import { ConsentModule } from './consent/consent.module';
import { DataExportModule } from './data-export/data-export.module';
import { GlobalAuthGuard } from './auth/global-auth.guard';

const redisUrl = process.env.REDIS_URL?.trim();

function throttlerSkipIf(context: ExecutionContext): boolean {
  if (context.getType() !== 'http') {
    return false;
  }
  const req = context.switchToHttp().getRequest<{ path?: string }>();
  const p = req?.path ?? '';
  return (
    p === '/health' ||
    p === '/thanks' ||
    p === '/metrics' ||
    p === '/api/payments/webhook' ||
    p === '/api/health'
  );
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 600,
        skipIf: throttlerSkipIf,
      },
    ]),
    ...(redisUrl
      ? [
          BullModule.forRoot({
            connection: { url: redisUrl },
          }),
        ]
      : []),
    RedisModule,
    MetricsModule,
    ScheduleModule.forRoot(),
    EmailModule,
    SupabaseModule,
    RealtimeModule,
    AuditModule,
    AuthModule,
    ProfilesModule,
    PlansModule,
    JobsModule,
    CompanyAdsModule,
    ApplicationsModule,
    ChatModule,
    PaymentsModule,
    AnalyticsModule,
    NotificationsModule,
    SearchModule,
    JobAlertsModule,
    SavedSearchesModule,
    LocationsModule,
    SavedModule,
    NewsletterModule,
    PricingInquiriesModule,
    BlogModule,
    SeoModule,
    CvModule,
    BillingModule,
    MaintenanceModule,
    StorageModule,
    ConsentModule,
    DataExportModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: GlobalAuthGuard,
    },
  ],
})
export class AppModule {}
