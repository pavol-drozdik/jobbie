import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { BackgroundQueueModule } from '../queue/background-queue.module';
import { CvController } from './cv.controller';
import { CvScopedSectionsController } from './cv-scoped-sections.controller';
import { CvPhotoUrlController } from './cv-photo-url.controller';
import { CvDocumentPaginateService } from './document/cv-document-paginate.service';
import { CvService } from './cv.service';
import { CvPdfService } from './cv-pdf.service';
import { CvHtmlPdfRenderer } from './cv-html-pdf.renderer';
import { CvPdfStorageService } from './cv-pdf-storage.service';
import { CvPdfQueueService } from './cv-pdf-queue.service';
import { CvPdfGenerationService } from './cv-pdf-generation.service';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => StorageModule),
    BackgroundQueueModule,
  ],
  controllers: [CvController, CvScopedSectionsController, CvPhotoUrlController],
  providers: [
    CvService,
    CvPdfService,
    CvHtmlPdfRenderer,
    CvDocumentPaginateService,
    CvPdfStorageService,
    CvPdfQueueService,
    CvPdfGenerationService,
  ],
  exports: [CvService, CvPdfService, CvPdfGenerationService],
})
export class CvModule {}
