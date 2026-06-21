import './instrument';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { RedisIoAdapter } from './common/redis-io.adapter';
import * as express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { setupExpressErrorHandler } from '@sentry/node';
import { AppModule } from './app.module';
import {
  buildNestCorsOptions,
  createExpressCorsMiddleware,
  shouldBypassCors,
} from './common/http-cors.util';
import {
  isNodeProduction,
  parseCorsOriginsFromEnv,
} from './common/runtime-env.util';

const MAX_CSP_REPORT_BYTES = 8_192;

async function bootstrap() {
  if (isNodeProduction() && !parseCorsOriginsFromEnv(process.env.CORS_ORIGINS)) {
    console.error(
      '[JOBBIE API] Set CORS_ORIGINS to a comma-separated list of allowed browser origins (e.g. https://app.example.com).',
    );
    process.exit(1);
  }
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cookieParser());
  const corsOptions = buildNestCorsOptions();
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (shouldBypassCors(req.path)) {
      return next();
    }
    return createExpressCorsMiddleware(corsOptions)(req, res, next);
  });
  // Stripe webhook needs raw body for signature verification
  app.use(
    '/api/payments/webhook',
    express.raw({ type: 'application/json' }),
  );
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path === '/api/payments/webhook') return next();
    if (req.path === '/api/csp-report' && req.method === 'POST') {
      return express.json({
        limit: MAX_CSP_REPORT_BYTES,
        type: ['application/json', 'application/csp-report'],
      })(req, res, next);
    }
    return express.json({ limit: '8mb' })(req, res, next);
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api', {
    exclude: ['health', 'thanks', 'debug/supabase-project', 'metrics'],
  });
  const expressApp = app.getHttpAdapter().getInstance();
  setupExpressErrorHandler(expressApp);
  const redisIo = new RedisIoAdapter(app, process.env.REDIS_URL);
  await redisIo.connectToRedis();
  app.useWebSocketAdapter(redisIo);
  if (
    isNodeProduction() &&
    process.env.REQUIRE_REDIS_IN_PRODUCTION === '1' &&
    !process.env.REDIS_URL?.trim()
  ) {
    console.error(
      '[JOBBIE API] REQUIRE_REDIS_IN_PRODUCTION=1 but REDIS_URL is unset. Configure Redis for feed cache and BullMQ.',
    );
    process.exit(1);
  }
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 8000);
  const queueMode = process.env.REDIS_URL?.trim() ? 'redis' : 'inline';
  try {
    const server = await app.listen(port);
    server.keepAliveTimeout = 65_000;
    server.headersTimeout = 66_000;
    console.log(`[JOBBIE API] queueMode=${queueMode}`);
  } catch (err: unknown) {
    const errno = err as NodeJS.ErrnoException;
    if (errno.code === 'EADDRINUSE') {
      console.error(
        `[JOBBIE API] Port ${port} is already in use. Close the other terminal running the API, or run: netstat -ano | findstr ":${port}" then Stop-Process -Id <PID> -Force (Windows). Or set PORT in .env to a free port.`,
      );
      process.exit(1);
    }
    throw err;
  }
  console.log(`JOBBIE API listening on http://localhost:${port} (Socket.IO on same port)`);
}

bootstrap();
