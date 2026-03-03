import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * When ValidationPipe throws with body { status: 'VALIDATION_ERRORS', errors },
 * respond with HTTP 422 so the frontend can show field-level errors.
 */
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const body = exception.getResponse();
    const status = exception.getStatus();

    if (
      status === 400 &&
      typeof body === 'object' &&
      body !== null &&
      'status' in body &&
      (body as { status: string }).status === 'VALIDATION_ERRORS'
    ) {
      return res.status(422).json(body);
    }

    return res.status(status).json(body);
  }
}
