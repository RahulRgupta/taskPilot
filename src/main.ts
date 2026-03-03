import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationError } from 'class-validator';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';
import { join } from 'path';
import express from 'express';
import cookieParser from 'cookie-parser';
import expressLayouts from 'express-ejs-layouts';
import { AppModule } from './app.module';

const APP_URL = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable cookie parser and form body parsing (for AJAX form submissions)
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Template variables for layouts (env, appUrl, authToken, etc.)
  app.use((req, res, next) => {
    res.locals.env = process.env.NODE_ENV || 'development';
    res.locals.appUrl = process.env.APP_URL || APP_URL;
    res.locals.apiUrl = process.env.API_URL || APP_URL;
    res.locals.adminUrl = process.env.ADMIN_URL || APP_URL;
    res.locals.ajaxUrl = process.env.AJAX_URL || APP_URL;
    res.locals.S3Url = process.env.S3URL || '';
    res.locals.authToken = ''; // We use httpOnly access_token cookie; JWT strategy reads from cookie
    res.locals.cacheSecret = process.env.CACHE_SECRET || '';
    next();
  });

  // Serve frontend template assets (CSS, JS, images) from /assets/ and /vendor/
  app.use(express.static(join(process.cwd(), 'frontend/public')));

  // Configure EJS view engine and layouts (views in frontend/app: views/, modules/*/views/)
  const viewsPath = join(process.cwd(), 'frontend', 'app');
  app.setBaseViewsDir(viewsPath);
  app.setViewEngine('ejs');
  app.use(expressLayouts);
  app.set('layout', 'views/layouts/dashboard');

  // Return 422 + { status: 'VALIDATION_ERRORS', errors } for frontend field errors
  app.useGlobalFilters(new ValidationExceptionFilter());

  // Enable validation pipe globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
      exceptionFactory: (errors: ValidationError[]) => {
        const errorMap: Record<string, string> = {};
        errors.forEach((e) => {
          const msg = e.constraints
            ? Object.values(e.constraints)[0]
            : 'Invalid value';
          errorMap[e.property] = msg;
        });
        return new BadRequestException({
          status: 'VALIDATION_ERRORS',
          errors: errorMap,
        });
      },
    }),
  );

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('NestJS Project Management API')
    .setDescription('API for organization, project, and task management with role-based access')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'JWT', in: 'header' },
      'access_token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
