import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'john@company.com', description: 'User email' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please enter a valid email' })
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6, description: 'User password' })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @ApiProperty({ enum: ['MANAGER', 'EMPLOYEE'], description: 'User role' })
  @IsNotEmpty({ message: 'Please select a role' })
  @IsString()
  @IsIn(['MANAGER', 'EMPLOYEE'], { message: 'Please select a role' })
  role: string;

  @ApiProperty({ example: 'EMP001', description: 'Employee code (unique per organization)' })
  @IsNotEmpty({ message: 'Employee code is required' })
  @IsString()
  employeeCode: string;

  @ApiProperty({ example: 'Engineering', description: 'Department name' })
  @IsNotEmpty({ message: 'Department is required' })
  @IsString()
  department: string;

  @ApiProperty({ example: 'Software Engineer', description: 'Job title' })
  @IsNotEmpty({ message: 'Job title is required' })
  @IsString()
  jobTitle: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number' })
  @IsNotEmpty({ message: 'Phone is required' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: '2025-01-15', description: 'Join date (ISO format)' })
  @IsOptional()
  @IsDateString()
  joinedAt?: string;
}
