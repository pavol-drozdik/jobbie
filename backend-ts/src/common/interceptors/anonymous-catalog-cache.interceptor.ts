import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/** Short CDN cache for anonymous GET catalog responses; never cache authenticated lists. */
@Injectable()
export class AnonymousCatalogCacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<{ method?: string; user?: unknown }>();
    const res = http.getResponse<{ setHeader?: (name: string, value: string) => void }>();
    if (req.method === 'GET' && res.setHeader) {
      if (req.user) {
        res.setHeader('Cache-Control', 'private, no-store');
      } else {
        res.setHeader(
          'Cache-Control',
          'public, max-age=60, stale-while-revalidate=120',
        );
      }
    }
    return next.handle();
  }
}
