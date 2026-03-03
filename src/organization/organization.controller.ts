import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Render,
  UseGuards,
  Request,
  Res,
  Redirect,
  Body,
  Param,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { OrganizationsService } from '../organizations/organizations.service';
import { ManagerService } from '../manager/manager.service';
import { alertRedirect } from '../common/response.helper';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, TaskStatus } from '@prisma/client';
import type { Response } from 'express';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateTaskDto } from '../manager/dto/create-task.dto';

@ApiTags('Organization')
@ApiBearerAuth('access_token')
@Controller('organization')
export class OrganizationController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly managerService: ManagerService,
  ) {}

  @Get('login')
  @ApiExcludeEndpoint()
  @Redirect('/login', 302)
  loginRedirect() {
    // Unified login at /login
  }

  @Get('dashboard')
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZATION)
  @Render('modules/organization/views/dashboard')
  async dashboard(@Request() req) {
    const orgIdFromUser = (req.user as any)?.organization?.id ?? Number((req.user as any)?.organizationId) ?? 0;
    const organizationId = orgIdFromUser ? Number(orgIdFromUser) : 0;
    const organization = organizationId ? await this.organizationsService.findOne(organizationId) : null;
    const orgId = organization ? (organization as any).id : organizationId;
    const projects = orgId ? await this.managerService.getProjectsByOrganization(Number(orgId)) : [];

    const users = (organization as any)?.users || [];
    const managers = users.filter((u: any) => u.role === Role.MANAGER) || [];
    const employees = users.filter((u: any) => u.role === Role.EMPLOYEE) || [];

    return {
      title: 'Organization Dashboard',
      user: req.user,
      organization,
      stats: {
        managers: managers.length,
        employees: employees.length,
        totalUsers: users.length,
        projects: Array.isArray(projects) ? projects.length : 0,
      },
    };
  }

  @Get('users')
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZATION)
  @Render('modules/organization/views/users')
  async users(@Request() req) {
    return {
      title: 'Manage Users',
      user: req.user,
      isSuperadmin: req.user?.role === Role.ADMIN,
      permissions: [],
      scriptFile: 'org-users',
    };
  }

  @Get('users/getList')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZATION)
  @ApiOperation({ summary: 'Get users list (DataTables format)' })
  @ApiResponse({ status: 200, description: 'Paginated users list' })
  async getUsersList(@Request() req, @Query() query: any, @Res() res: Response) {
    try {
      const organizationId = req.user.organizationId;
      const draw = parseInt(query.draw) || 1;
      const start = parseInt(query.start) || 0;
      const length = parseInt(query.length) || 20;
      const search = query['search[value]'] || query.search?.value || '';
      const roleFilter = query.roleFilter || '';

      let orderColumn = 'id';
      let orderDir = 'desc';
      if (query.order) {
        const orderInfo = Array.isArray(query.order) ? query.order[0] : query.order;
        if (orderInfo?.column) orderColumn = orderInfo.column;
        if (orderInfo?.dir) orderDir = orderInfo.dir;
      }

      const result = await this.organizationsService.getUsersList(organizationId, {
        draw, start, length, search, orderColumn, orderDir, roleFilter,
      });
      return res.json(result);
    } catch (err: any) {
      console.error('getUsersList error:', err);
      return res.status(500).json({
        draw: parseInt(query.draw) || 1,
        recordsTotal: 0, recordsFiltered: 0, data: [],
        error: err?.message || 'Internal server error',
      });
    }
  }

  @Get('users/new')
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZATION)
  @Render('modules/organization/views/create-user')
  createUserPage(@Request() req) {
    return {
      title: 'Add User (Manager or Employee)',
      user: req.user,
      isSuperadmin: req.user?.role === Role.ADMIN,
      permissions: [],
    };
  }

  @Get('users/:id/edit')
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZATION)
  @Render('modules/organization/views/edit-user')
  async editUserPage(@Request() req, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    const editUser = await this.organizationsService.findUserInOrganization(
      +id,
      organizationId,
    );
    return {
      title: 'Edit User',
      user: req.user,
      editUser,
      isSuperadmin: req.user?.role === Role.ADMIN,
    };
  }

  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZATION)
  @ApiOperation({ summary: 'Create manager/employee' })
  @ApiResponse({ status: 201, description: 'User created' })
  async createUser(
    @Request() req,
    @Body() createUserDto: CreateUserDto,
    @Res() res: Response,
  ) {
    try {
      const roleEnum =
        createUserDto.role === 'MANAGER' ? Role.MANAGER : Role.EMPLOYEE;
      await this.organizationsService.createUser(
        req.user.organizationId,
        createUserDto.email.trim(),
        createUserDto.name.trim(),
        createUserDto.password,
        roleEnum,
        {
          joinedAt: createUserDto.joinedAt,
          employeeCode: createUserDto.employeeCode,
          department: createUserDto.department,
          jobTitle: createUserDto.jobTitle,
          phone: createUserDto.phone,
        },
      );
      return res.status(201).json(
        alertRedirect(
          'Success',
          'success',
          'User added successfully',
          '/organization/users',
        ),
      );
    } catch (err: any) {
      const message = err?.response?.message || err?.message || 'Something went wrong';
      const text = typeof message === 'string' ? message : message[0] || 'Something went wrong';
      if (err instanceof ConflictException) {
        return res.status(409).json({
          status: 'ALERT',
          alertIcon: 'error',
          alertTitle: 'Error',
          alertText: text || 'This email is already in use',
        });
      }
      return res.status(400).json({
        status: 'ALERT',
        alertIcon: 'error',
        alertTitle: 'Error',
        alertText: text,
      });
    }
  }

  @Put('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZATION)
  async updateUser(
    @Request() req,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Res() res: Response,
  ) {
    try {
      await this.organizationsService.updateUser(
        +id,
        req.user.organizationId,
        {
          name: updateUserDto.name.trim(),
          email: updateUserDto.email.trim(),
          password: updateUserDto.password || undefined,
          role: updateUserDto.role === 'MANAGER' ? Role.MANAGER : Role.EMPLOYEE,
          joinedAt: updateUserDto.joinedAt,
          employeeCode: updateUserDto.employeeCode,
          department: updateUserDto.department,
          jobTitle: updateUserDto.jobTitle,
          phone: updateUserDto.phone,
        },
      );
      return res.status(200).json(
        alertRedirect(
          'Success',
          'success',
          'User updated successfully',
          '/organization/users',
        ),
      );
    } catch (err: any) {
      const message = err?.response?.message || err?.message || 'Something went wrong';
      const text = typeof message === 'string' ? message : message[0] || 'Something went wrong';
      if (err instanceof NotFoundException) {
        return res.status(404).json({
          status: 'ALERT',
          alertIcon: 'error',
          alertTitle: 'Error',
          alertText: text || 'User not found',
        });
      }
      if (err instanceof ConflictException) {
        return res.status(409).json({
          status: 'ALERT',
          alertIcon: 'error',
          alertTitle: 'Error',
          alertText: text || 'This email is already in use',
        });
      }
      return res.status(400).json({
        status: 'ALERT',
        alertIcon: 'error',
        alertTitle: 'Error',
        alertText: text,
      });
    }
  }

  // --- Projects (organization can create and manage projects) ---

  @Get('projects/getList')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZATION)
  @ApiOperation({ summary: 'Get projects list (DataTables format)' })
  @ApiResponse({ status: 200, description: 'Paginated projects list' })
  async getProjectsList(@Request() req, @Query() query: any, @Res() res: Response) {
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
        recordsTotal: 0, recordsFiltered: 0, data: [],
        error: err?.message || 'Internal server error',
      });
    }
  }

  @Get('projects/new')
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZATION)
  @Render('modules/organization/views/create-project')
  createProjectPage(@Request() req) {
    return {
      title: 'Create Project',
      user: req.user,
    };
  }

  @Get('projects/:id')
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZATION)
  @Render('modules/organization/views/project-detail')
  async projectDetail(@Request() req, @Param('id') id: string) {
    const organizationId = req.user.organizationId;
    const project = await this.managerService.getProject(+id, organizationId);
    const allManagers = await this.managerService.getManagersOfOrganization(organizationId);
    const allEmployees = await this.managerService.getEmployeesOfOrganization(organizationId);
    const assignedIds = (project as any).employees?.map((pe: any) => pe.user?.id).filter(Boolean) || [];
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

  @Get('projects')
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZATION)
  @Render('modules/organization/views/projects')
  async projects(@Request() req) {
    return {
      title: 'Projects',
      user: req.user,
      scriptFile: 'org-projects',
    };
  }

  @Post('projects')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZATION)
  @ApiOperation({ summary: 'Create new project' })
  @ApiResponse({ status: 201, description: 'Project created' })
  async createProject(
    @Request() req,
    @Body() createProjectDto: CreateProjectDto,
    @Res() res: Response,
  ) {
    const organizationId = req.user.organizationId;
    const createdById = req.user.id;
    await this.managerService.createProject(
      organizationId,
      createdById,
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
        '/organization/projects',
      ),
    );
  }

  @Post('projects/:id/employees')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZATION)
  @ApiOperation({ summary: 'Assign employees to project' })
  @ApiResponse({ status: 200, description: 'Employees assigned (redirect)' })
  async assignEmployeesToProject(
    @Request() req,
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
    return res.redirect('/organization/projects/' + id);
  }

  // ── Task Board (same as manager) ───────────────────────────────────────

  @Get('projects/:projectId/tasks')
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZATION)
  @Render('modules/organization/views/tasks')
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
      scriptFile: 'org-tasks',
    };
  }

  @Get('api/projects/:projectId/tasks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZATION)
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
  @Roles(Role.ORGANIZATION)
  @ApiOperation({ summary: 'Create new task' })
  @ApiResponse({ status: 201, description: 'Task created' })
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
  @Roles(Role.ORGANIZATION)
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
  @Roles(Role.ORGANIZATION)
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
