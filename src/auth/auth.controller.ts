import { Controller, Post, Body, UseGuards, Get, Request, Res, Render } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { Response } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'User with this email already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('register/organization')
  @ApiExcludeEndpoint()
  async registerOrganization(
    @Body() dto: RegisterOrganizationDto,
    @Res() res: Response,
  ) {
    try {
      await this.organizationsService.registerOrganization(
        dto.name.trim(),
        dto.email.trim(),
        dto.password,
        dto.address?.trim(),
        dto.phone?.trim(),
      );
      return res.redirect('/register?success=1');
    } catch (err: any) {
      const message =
        err?.response?.message || err?.message || 'Registration failed';
      const text =
        typeof message === 'string' ? message : message[0] || 'Registration failed';
      return res.redirect('/register?error=' + encodeURIComponent(text));
    }
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Returns JWT access token and user' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('web-login')
  @ApiExcludeEndpoint()
  async webLogin(@Body() loginDto: LoginDto, @Res() res: Response) {
    try {
      const result = await this.authService.login(loginDto);
      
      // Set cookie with JWT token
      res.cookie('access_token', result.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      });

      // Redirect based on role
      if (result.user.role === 'ADMIN') {
        return res.redirect('/admin/dashboard');
      } else if (result.user.role === 'ORGANIZATION') {
        return res.redirect('/organization/dashboard');
      } else if (result.user.role === 'MANAGER') {
        return res.redirect('/manager/dashboard');
      } else if (result.user.role === 'EMPLOYEE') {
        return res.redirect('/employee/dashboard');
      } else {
        return res.redirect('/dashboard');
      }
    } catch (error) {
      const message = error?.response?.message || error?.message || 'Invalid credentials';
      const displayMsg = Array.isArray(message) ? message[0] : message;
      return res.redirect('/login?error=' + encodeURIComponent(displayMsg));
    }
  }

  @Get('logout')
  @ApiExcludeEndpoint()
  async logout(@Res() res: Response) {
    // Clear cookie with same options as when setting it
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return res.redirect('/login');
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('access_token')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns authenticated user' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@Request() req) {
    return req.user;
  }
}

