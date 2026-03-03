import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTaskDto {
  @ApiProperty({ example: 'Implement login feature', description: 'Task title' })
  @IsNotEmpty({ message: 'Task title is required' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Add JWT auth and refresh token', description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 5, description: 'User ID of the assignee' })
  @IsNotEmpty({ message: 'Assignee is required' })
  @Type(() => Number)
  @IsInt()
  assignedToId: number;

  @ApiPropertyOptional({ example: '2025-02-26', description: 'Assign date (ISO format)' })
  @IsOptional()
  @IsDateString({}, { message: 'Invalid assign date format' })
  assignDate?: string;

  @ApiPropertyOptional({ example: '2025-03-15', description: 'Due date (ISO format)' })
  @IsOptional()
  @IsDateString({}, { message: 'Invalid due date format' })
  dueDate?: string;
}
