import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsIn,
  IsDateString,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'Mobile App v2', description: 'Project name' })
  @IsNotEmpty({ message: 'Project name is required' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Mobile app redesign', description: 'Project description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'], description: 'Project status' })
  @IsOptional()
  @IsString()
  @IsIn(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'], {
    message: 'Status must be one of: PLANNING, ACTIVE, ON_HOLD, COMPLETED',
  })
  status?: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH'], description: 'Project priority' })
  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH'], {
    message: 'Priority must be one of: LOW, MEDIUM, HIGH',
  })
  priority?: string;

  @ApiPropertyOptional({ example: '2025-02-26', description: 'Project start date (ISO format)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-06-30', description: 'Project end date (ISO format)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
