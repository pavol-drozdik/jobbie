import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { JobsModule } from '../jobs/jobs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatModule } from '../chat/chat.module';
import { CvModule } from '../cv/cv.module';
import { BillingModule } from '../billing/billing.module';
import { ApplicationsController } from './applications.controller';
import { EmployerApplicantsController } from './employer-applicants.controller';
import { EmployerApplicantsService } from './employer-applicants.service';
import { EmployerApplicantsPdfService } from './employer-applicants-pdf.service';
import { EmployerApplicantsExcelService } from './employer-applicants-excel.service';
import { EmployerCvDatabaseController } from './employer-cv-database.controller';
import { EmployerCvDatabaseService } from './employer-cv-database.service';

@Module({
  imports: [
    AuthModule,
    JobsModule,
    NotificationsModule,
    AuditModule,
    ChatModule,
    CvModule,
    BillingModule,
  ],
  controllers: [
    ApplicationsController,
    EmployerApplicantsController,
    EmployerCvDatabaseController,
  ],
  providers: [
    EmployerApplicantsService,
    EmployerApplicantsPdfService,
    EmployerApplicantsExcelService,
    EmployerCvDatabaseService,
  ],
})
export class ApplicationsModule {}
