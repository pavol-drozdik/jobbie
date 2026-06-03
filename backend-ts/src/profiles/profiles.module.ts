import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { PaymentsModule } from '../payments/payments.module';
import { ProfilesController } from './profiles.controller';
import { SearchModule } from '../search/search.module';
import { NewsletterModule } from '../newsletter/newsletter.module';
import { DataExportModule } from '../data-export/data-export.module';
import { SkRpoLookupService } from '../registry/sk-rpo-lookup.service';
import { ChatModule } from '../chat/chat.module';
import { ProfileOpenChatService } from './profile-open-chat.service';

@Module({
  imports: [
    AuthModule,
    SearchModule,
    AuditModule,
    PaymentsModule,
    NewsletterModule,
    DataExportModule,
    ChatModule,
  ],
  controllers: [ProfilesController],
  providers: [SkRpoLookupService, ProfileOpenChatService],
})
export class ProfilesModule {}
