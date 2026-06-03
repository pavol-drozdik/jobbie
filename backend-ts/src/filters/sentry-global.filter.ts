import { Catch, HttpException, ArgumentsHost, Injectable } from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import * as Sentry from '@sentry/node';

/**
 * Reports server errors to Sentry before delegating to Nest default handling.
 */
@Injectable()
@Catch()
export class SentryGlobalFilter extends BaseExceptionFilter {
  constructor(adapterHost: HttpAdapterHost) {
    super(adapterHost.httpAdapter);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const shouldReport =
      !(exception instanceof HttpException) || exception.getStatus() >= 500;
    if (shouldReport) {
      Sentry.captureException(exception);
    }
    super.catch(exception, host);
  }
}
