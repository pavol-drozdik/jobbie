import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminStorageController } from './admin-storage.controller';
import { AdminStorageService } from './admin-storage.service';

@Module({
  imports: [AdminAuthModule, SupabaseModule],
  controllers: [AdminStorageController],
  providers: [AdminStorageService],
})
export class AdminStorageModule {}
