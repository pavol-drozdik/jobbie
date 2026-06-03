import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';

const dotenvPath = process.env.DOTENV_CONFIG_PATH?.trim();
if (dotenvPath) {
  dotenv.config({ path: dotenvPath });
} else {
  dotenv.config();
}
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { validateAdminApiEnv } from './validate-env';

async function bootstrap() {
  validateAdminApiEnv();
  const app = await NestFactory.create(AppModule);
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"] } },
    }),
  );
  app.enableCors({
    origin: [
      'http://127.0.0.1:5199',
      'http://localhost:5199',
      'app://.',
    ],
    credentials: false,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api', { exclude: ['health'] });
  const port = Number(process.env.ADMIN_API_PORT ?? process.env.PORT ?? 3099);
  await app.listen(port, '127.0.0.1');
  console.log(`JOBBIE Admin API listening on http://127.0.0.1:${port}`);
}

bootstrap().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('[admin-api] Failed to start:', msg);
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
