import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  // CORS first so browser preflight and responses get correct headers
  app.enableCors({
    origin: true, // reflect request origin (required when credentials: true)
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
  // Stripe webhook needs raw body for signature verification
  app.use(
    '/api/payments/webhook',
    express.raw({ type: 'application/json' }),
  );
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path === '/api/payments/webhook') return next();
    return express.json()(req, res, next);
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.useWebSocketAdapter(new IoAdapter(app));
  const port = process.env.PORT ?? 8000;
  await app.listen(port);
  console.log(`JOBBIE API listening on http://localhost:${port} (Socket.IO on same port)`);
}

bootstrap();
