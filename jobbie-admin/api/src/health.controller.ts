import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseAdminRecentLoginMinutes } from './auth/admin-recent-login.config';
import { Public } from './auth/public.decorator';

function readPackageVersion(): string {
  try {
    const pkgPath = join(__dirname, '..', 'package.json');
    const raw = readFileSync(pkgPath, 'utf8');
    const parsed = JSON.parse(raw) as { version?: string };
    return parsed.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

@Controller()
export class HealthController {
  private readonly version = readPackageVersion();

  constructor(private readonly config: ConfigService) {}

  @Public()
  @Get('health')
  health(): {
    ok: true;
    version: string;
    recentLoginMinutes: number;
  } {
    return {
      ok: true,
      version: this.version,
      recentLoginMinutes: parseAdminRecentLoginMinutes(
        this.config.get<string>('ADMIN_RECENT_LOGIN_MINUTES'),
      ),
    };
  }
}
