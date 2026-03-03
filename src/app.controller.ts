import { Controller, Get, Render, Request } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiExcludeEndpoint()
  @Render('views/landing')
  getLanding() {
    return {
      layout: 'views/layouts/auth',
      title: 'Task Pilot - Task Management for Teams',
    };
  }

  @Get('login')
  @ApiExcludeEndpoint()
  @Render('views/login')
  loginPage(@Request() req: { query?: { error?: string } }) {
    return {
      layout: 'views/layouts/auth',
      title: 'Sign in',
      error: req.query?.error || undefined,
    };
  }

  @Get('register')
  @ApiExcludeEndpoint()
  @Render('views/register-organization')
  registerPage(@Request() req: { query?: { error?: string; success?: string } }) {
    return {
      layout: 'views/layouts/auth',
      title: 'Register Organization',
      error: req.query?.error || undefined,
      success: req.query?.success === '1' || undefined,
    };
  }
}
