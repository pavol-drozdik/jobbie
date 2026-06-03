import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { CvModule } from '../cv/cv.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { BackgroundQueueModule } from '../queue/background-queue.module';
import { FileScanService } from './file-scan.service';
import { ImageProcessService } from './image-process.service';
import { StorageController } from './storage.controller';
import { StorageUploadService } from './storage-upload.service';

@Module({
  imports: [
    SupabaseModule,
    AuthModule,
    AuditModule,
    BackgroundQueueModule,
    forwardRef(() => CvModule),
  ],
  controllers: [StorageController],
  providers: [StorageUploadService, ImageProcessService, FileScanService],
  exports: [StorageUploadService],
})
export class StorageModule {}
