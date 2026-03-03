import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateOrganizationDto {
  @ApiProperty({ example: 'Acme Corp', description: 'Organization name' })
  @IsNotEmpty({ message: 'Organization name is required' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'admin@acme.com', description: 'Organization email' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please enter a valid email' })
  email: string;

  @ApiPropertyOptional({ example: '123 Main St', description: 'Organization address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Organization phone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'true', description: 'Whether organization is active (form sends string)' })
  @IsOptional()
  @IsString()
  isActive?: string;
}
