import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
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
import { ManagerService } from './manager.service';
import { alertRedirect } from '../common/response.helper';
import { CreateProjectDto } from '../organization/dto/create-project.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import type { Response } from 'express';

@ApiTags('Manager')
@ApiBearerAuth('access_token')
@Controller('manager')
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER)
  @Render('modules/manager/views/dashboard')
  async dashboard(@Request() req: { user: { organizationId: number } }) {
    const organizationId = req.user.organizationId;
    if (!organizationId) throw new Error('Manager must belong to an organization');
    const organization = await this.managerService.getOrganizationForManager(organizationId);
    const projects = await this.managerService.getProjectsByOrganization(organizationId);
    const employees = (organization as any).users || [];
    return {
      title: 'Manager Dashboard',
      user: req.user,
      organization,
      projects,
      stats: {
        projects: projects.length,
        employees: employees.length,
      },
    };
  }

  @Get('projects')
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER)
  @Render('modules/manager/views/projects')
  async projects(@Request() req: { user: { organizationId: number } }) {
    return {
      title: 'Projects',
      user: req.user,
      scriptFile: 'manager-projects',
    };
  }

  @Get('projects/getList')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Get projects list (DataTables format)' })
  @ApiResponse({ status: 200, description: 'Paginated projects list' })
  async getProjectsList(
    @Request() req: { user: { organizationId: number } },
    @Query() query: any,
    @Res() res: Response,
  ) {
    try {
      const organizationId = req.user.organizationId;
      const draw = parseInt(query.draw) || 1;
      const start = parseInt(query.start) || 0;
      const length = parseInt(query.length) || 20;
      const search = query['search[value]'] || query.search?.value || '';

      let orderColumn = 'id';
      let orderDir = 'desc';
      if (query.order) {
        const orderInfo = Array.isArray(query.order) ? query.order[0] : query.order;
        if (orderInfo?.column) orderColumn = orderInfo.column;
        if (orderInfo?.dir) orderDir = orderInfo.dir;
      }

      const result = await this.managerService.getProjectsList(organizationId, {
        draw, start, length, search, orderColumn, orderDir,
      });
      return res.json(result);
    } catch (err: any) {
      console.error('getProjectsList error:', err);
      return res.status(500).json({
        draw: parseInt(query.draw) || 1,
        recordsTotal: 0,
        recordsFiltered: 0,
        data: [],
        error: err?.message || 'Internal server error',
      });
    }
  }

  @Get('projects/new')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER)
  @Render('modules/manager/views/create-project')
  createProjectPage(@Request() req: { user: { organizationId: number } }) {
    return {
      title: 'Create Project',
      user: req.user,
    };
  }

  @Post('projects')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Create new project' })
  @ApiResponse({ status: 201, description: 'Project created' })
  async createProject(
    @Request() req: { user: { organizationId: number; id: number } },
    @Body() createProjectDto: CreateProjectDto,
    @Res() res: Response,
  ) {
    const organizationId = req.user.organizationId;
    const managerId = req.user.id;
    await this.managerService.createProject(
      organizationId,
      managerId,
      createProjectDto.name.trim(),
      createProjectDto.description?.trim(),
      {
        ...(createProjectDto.status && { status: createProjectDto.status as any }),
        ...(createProjectDto.priority && { priority: createProjectDto.priority as any }),
        ...(createProjectDto.startDate && { startDate: createProjectDto.startDate }),
        ...(createProjectDto.endDate && { endDate: createProjectDto.endDate }),
      },
    );
    return res.status(201).json(
      alertRedirect(
        'Success',
        'success',
        'Project created successfully',
        '/manager/projects',
      ),
    );
  }

  @Get('projects/:id')
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER)
  @Render('modules/manager/views/project-detail')
  async projectDetail(
    @Request() req: { user: { organizationId: number } },
    @Param('id') id: string,
  ) {
    const organizationId = req.user.organizationId;
    const project = await this.managerService.getProject(+id, organizationId);
    const allManagers = await this.managerService.getManagersOfOrganization(organizationId);
    const allEmployees = await this.managerService.getEmployeesOfOrganization(organizationId);
    const assignedIds =
      (project as any).employees?.map((pe: any) => pe.user?.id).filter(Boolean) || [];
    const teamOptions = [
      ...(allManagers || []).map((p) => ({
        id: p.id,
        name: `${p.name || p.email} (Manager)`,
      })),
      ...(allEmployees || []).map((p) => ({
        id: p.id,
        name: `${p.name || p.email} (Employee)`,
      })),
    ];
    return {
      title: 'Project: ' + (project as any).name,
      user: req.user,
      project,
      allManagers,
      allEmployees,
      teamOptions,
      assignedIds,
    };
  }

  @Post('projects/:id/employees')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Assign employees to project' })
  @ApiResponse({ status: 200, description: 'Employees assigned (redirect)' })
  async assignEmployees(
    @Request() req: { user: { organizationId: number } },
    @Param('id') id: string,
    @Body() body: { employeeIds?: string | string[] },
    @Res() res: Response,
  ) {
    const organizationId = req.user.organizationId;
    const raw = body.employeeIds;
    const ids = Array.isArray(raw)
      ? raw.map((x) => parseInt(String(x), 10)).filter((n) => !isNaN(n))
      : raw
        ? [parseInt(String(raw), 10)].filter((n) => !isNaN(n))
        : [];
    await this.managerService.assignEmployeesToProject(+id, organizationId, ids);
    return res.redirect('/manager/projects/' + id);
  }

  // ── Tasks (Kanban) ───────────────────────────────────────────

  @Get('projects/:projectId/tasks')
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER)
  @Render('modules/manager/views/tasks')
  async tasksPage(
    @Request() req: { user: { organizationId: number; id: number } },
    @Param('projectId') projectId: string,
  ) {
    const organizationId = req.user.organizationId;
    const project = await this.managerService.getProject(+projectId, organizationId);
    const members = await this.managerService.getProjectMembers(+projectId, organizationId);
    return {
      title: `Tasks: ${(project as any).name}`,
      user: req.user,
      project,
      members,
      scriptFile: 'manager-tasks',
    };
  }

  @Get('api/projects/:projectId/tasks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Get tasks for a project' })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  async getTasks(
    @Request() req: { user: { organizationId: number } },
    @Param('projectId') projectId: string,
    @Res() res: Response,
  ) {
    try {
      const tasks = await this.managerService.getTasksByProject(
        +projectId,
        req.user.organizationId,
      );
      return res.json({ tasks });
    } catch (err: any) {
      console.error('getTasks error:', err);
      return res.status(500).json({ error: err?.message || 'Internal server error' });
    }
  }

  @Post('api/projects/:projectId/tasks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Create new task' })
  @ApiResponse({ status: 201, description: 'Task created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createTask(
    @Request() req: { user: { organizationId: number; id: number } },
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
    @Res() res: Response,
  ) {
    try {
      const task = await this.managerService.createTask(
        +projectId,
        req.user.organizationId,
        req.user.id,
        {
          title: dto.title.trim(),
          description: dto.description?.trim(),
          assignedToId: dto.assignedToId,
          assignDate: dto.assignDate,
          dueDate: dto.dueDate,
        },
      );
      return res.status(201).json({ task });
    } catch (err: any) {
      console.error('createTask error:', err);
      const msg = err?.response?.message || err?.message || 'Failed to create task';
      return res.status(400).json({ error: typeof msg === 'string' ? msg : msg[0] });
    }
  }

  @Put('api/tasks/:taskId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Update task status' })
  @ApiResponse({ status: 200, description: 'Task status updated' })
  async updateTaskStatus(
    @Request() req: { user: { organizationId: number } },
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
      const task = await this.managerService.updateTaskStatus(
        +taskId,
        req.user.organizationId,
        status,
      );
      return res.json({ task });
    } catch (err: any) {
      console.error('updateTaskStatus error:', err);
      return res.status(500).json({ error: err?.message || 'Failed to update status' });
    }
  }

  @Delete('api/tasks/:taskId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: 'Delete task' })
  @ApiResponse({ status: 200, description: 'Task deleted' })
  async deleteTask(
    @Request() req: { user: { organizationId: number } },
    @Param('taskId') taskId: string,
    @Res() res: Response,
  ) {
    try {
      await this.managerService.deleteTask(+taskId, req.user.organizationId);
      return res.json({ success: true });
    } catch (err: any) {
      console.error('deleteTask error:', err);
      return res.status(500).json({ error: err?.message || 'Failed to delete task' });
    }
  }
}
