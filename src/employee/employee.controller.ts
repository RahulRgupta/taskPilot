import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Render,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, TaskStatus } from '@prisma/client';
import { EmployeeService } from './employee.service';
import type { Response } from 'express';

@ApiTags('Employee')
@ApiBearerAuth('access_token')
@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYEE)
  @Render('modules/employee/views/dashboard')
  async dashboard(@Request() req: { user: { id: number; organizationId: number } }) {
    const projects = await this.employeeService.getAssignedProjects(req.user.id);
    return {
      title: 'Employee Dashboard',
      user: req.user,
      projects,
      stats: {
        projects: projects.length,
      },
    };
  }

  @Get('projects')
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYEE)
  @Render('modules/employee/views/projects')
  async projects(@Request() req: { user: { id: number } }) {
    const projects = await this.employeeService.getAssignedProjects(req.user.id);
    return {
      title: 'My Projects',
      user: req.user,
      projects,
    };
  }

  @Get('projects/:projectId/tasks')
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYEE)
  @Render('modules/employee/views/tasks')
  async tasksPage(
    @Request() req: { user: { id: number; organizationId: number } },
    @Param('projectId') projectId: string,
  ) {
    const project = await this.employeeService.getProjectForEmployee(+projectId, req.user.id);
    return {
      title: `Tasks: ${(project as any).name}`,
      user: req.user,
      project,
      scriptFile: 'employee-tasks',
    };
  }

  @Get('api/projects/:projectId/tasks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYEE)
  async getTasks(
    @Request() req: { user: { id: number } },
    @Param('projectId') projectId: string,
    @Res() res: Response,
  ) {
    try {
      const tasks = await this.employeeService.getTasksByProject(+projectId, req.user.id);
      return res.json({ tasks });
    } catch (err: any) {
      console.error('employee getTasks error:', err);
      return res.status(500).json({ error: err?.message || 'Internal server error' });
    }
  }

  @Put('api/tasks/:taskId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYEE)
  @ApiOperation({ summary: 'Update task status' })
  @ApiResponse({ status: 200, description: 'Task status updated' })
  async updateTaskStatus(
    @Request() req: { user: { id: number; organizationId: number } },
    @Param('taskId') taskId: string,
    @Body() body: { status: string },
    @Res() res: Response,
  ) {
    try {
      const validStatuses: Record<string, TaskStatus> = {
        ASSIGNED: TaskStatus.ASSIGNED,
        IN_PROGRESS: TaskStatus.IN_PROGRESS,
        COMPLETED: TaskStatus.COMPLETED,
      };
      const status = validStatuses[body.status];
      if (!status) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      const task = await this.employeeService.updateTaskStatus(
        +taskId,
        req.user.id,
        req.user.organizationId,
        status,
      );
      return res.json({ task });
    } catch (err: any) {
      console.error('employee updateTaskStatus error:', err);
      return res.status(500).json({ error: err?.message || 'Failed to update status' });
    }
  }
}
