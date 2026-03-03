import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Render,
  UseGuards,
  Request,
  Redirect,
  Param,
  Res,
  Req,
  ConflictException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { alertRedirect } from '../common/response.helper';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@ApiTags('Admin')
@ApiBearerAuth('access_token')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly organizationsService: OrganizationsService,
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
  @Roles(Role.ADMIN)
  @Render('modules/admin/views/dashboard')
  async dashboard(@Request() req) {
    const stats = await this.adminService.getDashboardStats();
    return {
      title: 'Admin Dashboard',
      user: req.user,
      isSuperadmin: req.user?.role === Role.ADMIN,
      permissions: [],
      stats,
    };
  }

  @Get('organizations')
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Render('modules/admin/views/organizations')
  async organizations(@Request() req) {
    return {
      title: 'Organizations',
      user: req.user,
      isSuperadmin: req.user?.role === Role.ADMIN,
      permissions: [],
      scriptFile: 'admin-organizations',
    };
  }

  @Get('organizations/getList')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get organizations list (DataTables format)' })
  @ApiResponse({ status: 200, description: 'Paginated organizations list' })
  async getOrganizationsList(@Query() query: any, @Res() res: Response) {
    try {
      const draw = parseInt(query.draw) || 1;
      const start = parseInt(query.start) || 0;
      const length = parseInt(query.length) || 20;
      const search = query['search[value]'] || query.search?.value || '';
      const statusFilter = query.statusFilter || '';

      let orderColumn = 'id';
      let orderDir = 'desc';
      if (query.order) {
        const orderInfo = Array.isArray(query.order) ? query.order[0] : query.order;
        if (orderInfo?.column) orderColumn = orderInfo.column;
        if (orderInfo?.dir) orderDir = orderInfo.dir;
      }

      const result = await this.adminService.getOrganizationsList({
        draw, start, length, search, orderColumn, orderDir, statusFilter,
      });
      return res.json(result);
    } catch (err: any) {
      console.error('getOrganizationsList error:', err);
      return res.status(500).json({
        draw: parseInt(query.draw) || 1,
        recordsTotal: 0, recordsFiltered: 0, data: [],
        error: err?.message || 'Internal server error',
      });
    }
  }

  @Get('organizations/new')
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Render('modules/admin/views/create-organization')
  createOrganizationPage(@Request() req) {
    return {
      title: 'Create Organization',
      user: req.user,
      isSuperadmin: req.user?.role === Role.ADMIN,
      permissions: [],
    };
  }

  @Post('organizations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create new organization' })
  @ApiResponse({ status: 201, description: 'Organization created' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createOrganization(
    @Body() createOrgDto: CreateOrganizationDto,
    @Res() res: Response,
  ) {
    try {
      await this.organizationsService.create(
        createOrgDto.name.trim(),
        createOrgDto.email.trim(),
        createOrgDto.address?.trim(),
        createOrgDto.phone?.trim(),
        createOrgDto.password,
      );
      return res.status(201).json(
        alertRedirect(
          'Success',
          'success',
          'Organization created successfully',
          '/admin/organizations',
        ),
      );
    } catch (err: any) {
      const message =
        err?.response?.message || err?.message || 'Something went wrong';
      const text =
        typeof message === 'string'
          ? message
          : message[0] || 'Something went wrong';
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

  @Get('organizations/:id')
  @ApiExcludeEndpoint()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Render('modules/admin/views/organization-detail')
  async organizationDetail(@Param('id') id: string, @Request() req) {
    const org = await this.adminService.getOrganization(+id);
    return {
      title: 'Organization Details',
      user: req.user,
      isSuperadmin: req.user?.role === Role.ADMIN,
      permissions: [],
      organization: org,
      errors: undefined,
      form: undefined,
    };
  }

  @Post('organizations/:id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiExcludeEndpoint()
  async verifyOrganization(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    try {
      await this.organizationsService.verifyOrganization(+id);
      return res.status(200).json(
        alertRedirect(
          'Success',
          'success',
          'Organization verified. They can now sign in.',
          '/admin/organizations/' + id,
        ),
      );
    } catch (err: any) {
      const message = err?.response?.message || err?.message || 'Failed to verify';
      return res.status(400).json({
        status: 'ALERT',
        alertIcon: 'error',
        alertTitle: 'Error',
        alertText: message,
      });
    }
  }

  @Put('organizations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update organization' })
  @ApiResponse({ status: 200, description: 'Organization updated' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async updateOrganization(
    @Param('id') id: string,
    @Body() body: UpdateOrganizationDto,
    @Req() req: { body: Record<string, unknown> },
    @Res() res: Response,
  ) {
    try {
      // Read isActive from raw body (form-urlencoded sends string; ValidationPipe may strip/transform)
      const rawIsActive = req.body?.isActive;
      const isActive =
        rawIsActive === true ||
        rawIsActive === 'true' ||
        rawIsActive === 'on' ||
        rawIsActive === '1';
      await this.organizationsService.update(+id, {
        name: body.name?.trim(),
        email: body.email?.trim(),
        address: body.address?.trim(),
        phone: body.phone?.trim(),
        isActive,
      });
      return res.status(200).json(
        alertRedirect(
          'Success',
          'success',
          'Organization updated successfully',
          '/admin/organizations/' + id,
        ),
      );
    } catch (err: any) {
      const message =
        err?.response?.message || err?.message || 'Something went wrong';
      const text =
        typeof message === 'string'
          ? message
          : message[0] || 'Something went wrong';
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

  @Post('organizations/:id/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create manager/employee for organization' })
  @ApiResponse({ status: 201, description: 'User created' })
  async createUser(
    @Param('id') id: string,
    @Body()
    createUserDto: {
      email: string;
      name: string;
      password: string;
      role: 'MANAGER' | 'EMPLOYEE';
      joinedAt?: string;
      employeeCode?: string;
      department?: string;
      jobTitle?: string;
      phone?: string;
    },
    @Res() res: Response,
  ) {
    const role =
      createUserDto.role === 'MANAGER' ? Role.MANAGER : Role.EMPLOYEE;
    await this.organizationsService.createUser(
      +id,
      createUserDto.email,
      createUserDto.name,
      createUserDto.password,
      role,
      {
        joinedAt: createUserDto.joinedAt,
        employeeCode: createUserDto.employeeCode,
        department: createUserDto.department,
        jobTitle: createUserDto.jobTitle,
        phone: createUserDto.phone,
      },
    );
    return res.redirect(`/admin/organizations/${id}`);
  }
}
