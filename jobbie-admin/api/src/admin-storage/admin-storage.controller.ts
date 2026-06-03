import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { AppRoleGuard } from '../auth/app-role.guard';
import { RequireAppRoles } from '../auth/app-roles.decorator';
import { RequireRecentLogin } from '../auth/require-recent-login.decorator';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/auth.types';
import { AdminStorageFinalizeDto, AdminStorageInitDto } from './admin-storage.dto';
import { AdminStorageService } from './admin-storage.service';

@Controller('admin/storage/uploads')
@RequireAppRoles('admin')
@UseGuards(JwksAuthGuard, AppRoleGuard)
@RequireRecentLogin()
export class AdminStorageController {
  constructor(private readonly storage: AdminStorageService) {}

  @Post('init')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  init(
    @CurrentUserDecorator() admin: CurrentUser,
    @Body() body: AdminStorageInitDto,
  ) {
    return this.storage.initBlogUpload(admin.id, body);
  }

  @Post(':uploadId/finalize')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  finalize(
    @CurrentUserDecorator() admin: CurrentUser,
    @Param('uploadId') uploadId: string,
    @Body() body: AdminStorageFinalizeDto,
  ) {
    return this.storage.finalizeBlogUpload(admin.id, uploadId, body.reportedSizeBytes);
  }
}
