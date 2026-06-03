import { Module } from '@nestjs/common';
import { CvModule } from '../cv/cv.module';
import { DataExportService } from './data-export.service';

@Module({
  imports: [CvModule],
  providers: [DataExportService],
  exports: [DataExportService],
})
export class DataExportModule {}
