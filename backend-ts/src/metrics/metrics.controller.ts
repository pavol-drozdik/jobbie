import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { WebVitalsBatchDto } from './web-vitals.dto';

/**
 * Ingest sampled Core Web Vitals from the Nuxt client (`web-vitals` library).
 */
@Controller('metrics')
@Throttle({ default: { limit: 40, ttl: 60000 } })
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);

  @Post('web-vitals')
  @HttpCode(HttpStatus.NO_CONTENT)
  async ingestWebVitals(@Body() body: WebVitalsBatchDto): Promise<void> {
    const path = body.path?.slice(0, 512) ?? '';
    for (const m of body.metrics ?? []) {
      if (
        m.name === 'LCP' ||
        m.name === 'CLS' ||
        m.name === 'INP' ||
        m.name === 'FID' ||
        m.name === 'TTFB'
      ) {
        this.logger.log(
          `web-vitals ${m.name}=${Number(m.value).toFixed(3)} path=${path}`,
        );
      }
    }
  }
}
