import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { AppRoleGuard } from '../auth/app-role.guard';
import { RequireAppRoles } from '../auth/app-roles.decorator';
import { RequireRecentLogin } from '../auth/require-recent-login.decorator';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/auth.types';
import { AdminBlogListQueryDto, AdminBlogUpsertDto } from './admin-blog.dto';
import { AdminBlogService } from './admin-blog.service';

@Controller('admin/blog')
@RequireAppRoles('admin')
@UseGuards(JwksAuthGuard, AppRoleGuard)
@RequireRecentLogin()
export class AdminBlogController {
  constructor(private readonly blog: AdminBlogService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  list(@Query() query: AdminBlogListQueryDto) {
    return this.blog.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.blog.getById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  create(
    @CurrentUserDecorator() admin: CurrentUser,
    @Body() body: AdminBlogUpsertDto,
  ) {
    return this.blog.create(admin, body);
  }

  @Patch(':id')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  update(
    @CurrentUserDecorator() admin: CurrentUser,
    @Param('id') id: string,
    @Body() body: AdminBlogUpsertDto,
  ) {
    return this.blog.update(admin, id, body);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  publish(
    @CurrentUserDecorator() admin: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.blog.publish(admin, id);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  unpublish(
    @CurrentUserDecorator() admin: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.blog.unpublish(admin, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  remove(
    @CurrentUserDecorator() admin: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.blog.remove(admin, id);
  }
}
