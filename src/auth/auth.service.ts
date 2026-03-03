import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.usersService.findOne(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = await this.usersService.create(
      registerDto.email,
      registerDto.name || null,
      hashedPassword,
    );

    // Generate JWT token
    const payload = { email: user.email, sub: user.id };
    const access_token = this.jwtService.sign(payload);

    // Remove password from user object
    const { password, ...result } = user;

    return {
      access_token,
      user: result,
    };
  }

  async login(loginDto: LoginDto) {
    // Find user by email
    const user = await this.usersService.findOne(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Block login if user belongs to an inactive organization
    const org = (user as User & { organization?: { isActive: boolean; isVerified?: boolean } | null }).organization;
    if (user.organizationId && org && !org.isActive) {
      throw new UnauthorizedException('Your organization has been deactivated. Please contact the administrator.');
    }

    // Block login for ORGANIZATION role if admin has not verified yet
    if (user.role === 'ORGANIZATION' && org && !org.isVerified) {
      throw new UnauthorizedException('Your organization is pending admin verification. You will be able to sign in once approved.');
    }

    // Generate JWT token
    const payload = { email: user.email, sub: user.id };
    const access_token = this.jwtService.sign(payload);

    // Remove password from user object
    const { password, ...result } = user;

    return {
      access_token,
      user: result,
    };
  }
}

