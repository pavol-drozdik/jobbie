import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Observable, finalize } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';
import { CurrentUser } from '../auth/auth.types';
import {
  httpRequestDurationSeconds,
  httpRequestsTotal,
  pathGroupForMetrics,
} from '../observability/metrics';
import { Request, Response } from 'express';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: CurrentUser }>();
    const res = http.getResponse<Response>();
    const sampleRaw = this.config.get<string>('AUDIT_API_SAMPLE_RATE');
    const sample =
      sampleRaw === undefined || sampleRaw === ''
        ? 0.02
        : Math.min(1, Math.max(0, Number(sampleRaw)));
    const skipPaths = new Set(['/api/health', '/health', '/metrics']);
    const path = req.path ?? req.url?.split('?')[0] ?? '';
    if (skipPaths.has(path)) {
      return next.handle();
    }
    const started = Date.now();
    const requestId = randomUUID();
    res.setHeader('X-Request-Id', requestId);
    const shouldPersistSample = Math.random() <= sample;
    return next.handle().pipe(
      finalize(() => {
        const latencyMs = Date.now() - started;
        const statusCode = String(res.statusCode);
        const group = pathGroupForMetrics(path);
        httpRequestsTotal.inc({ method: req.method, status_code: statusCode });
        httpRequestDurationSeconds.observe(
          { method: req.method, path_group: group },
          latencyMs / 1000,
        );
        if (!shouldPersistSample) {
          return;
        }
        const userId = req.user?.id ?? null;
        void this.supabase
          .getClient()
          .from('api_request_logs')
          .insert({
            method: req.method,
            path,
            status_code: res.statusCode,
            latency_ms: latencyMs,
            user_id: userId,
            request_id: requestId,
          });
      }),
    );
  }
}
