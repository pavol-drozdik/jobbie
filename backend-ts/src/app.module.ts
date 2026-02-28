import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { ProfilesModule } from './profiles/profiles.module';
import { PlansModule } from './plans/plans.module';
import { JobsModule } from './jobs/jobs.module';
import { ApplicationsModule } from './applications/applications.module';
import { PaymentsModule } from './payments/payments.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SupabaseModule,
    AuthModule,
    ProfilesModule,
    PlansModule,
    JobsModule,
    ApplicationsModule,
    ChatModule,
    PaymentsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
