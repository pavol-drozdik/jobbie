import { Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../auth/public.decorator';
import { parseCspReportBody } from './csp-report.util';

const MAX_BODY_BYTES = 8_192;

/**
 * Collects CSP violation reports from the PWA (report-uri / report-only rollout).
 * Does not persist PII — logs aggregated violation document-uri + blocked-uri only.
 */
@Controller('csp-report')
export class CspReportController {
  @Public()
  @Post()
  @HttpCode(204)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  report(@Req() req: Request): void {
    const length = Number(req.headers['content-length'] ?? 0);
    if (length > MAX_BODY_BYTES) {
      return;
    }
    const summary = parseCspReportBody(req.body);
    if (!summary) {
      return;
    }
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info('[csp-report]', summary);
    }
  }
}
