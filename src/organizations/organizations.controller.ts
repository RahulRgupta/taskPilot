import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Organizations')
@ApiBearerAuth('access_token')
@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create organization (Admin only)' })
  @ApiResponse({ status: 201, description: 'Organization created' })
  @ApiResponse({ status: 409, description: 'Organization/email already exists' })
  async create(
    @Body() createOrgDto: { name: string; email: string; address?: string; phone?: string },
  ) {
    return this.organizationsService.create(
      createOrgDto.name,
      createOrgDto.email,
      createOrgDto.address,
      createOrgDto.phone,
    );
  }

  @Get()
  @Roles(Role.ADMIN)
  async findAll() {
    return this.organizationsService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get organization by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Organization details' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(+id);
  }

  @Post(':id/managers')
  @Roles(Role.ADMIN, Role.ORGANIZATION)
  @ApiOperation({ summary: 'Create manager for organization' })
  @ApiResponse({ status: 201, description: 'Manager created' })
  async createManager(
    @Param('id') id: string,
    @Body() createManagerDto: { email: string; name: string; password: string },
    @Request() req,
  ) {
    const organizationId = req.user.role === Role.ADMIN ? +id : req.user.organizationId;
    return this.organizationsService.createManager(
      organizationId,
      createManagerDto.email,
      createManagerDto.name,
      createManagerDto.password,
    );
  }

  @Post(':id/employees')
  @Roles(Role.ADMIN, Role.ORGANIZATION, Role.MANAGER)
  async createEmployee(
    @Param('id') id: string,
    @Body() createEmployeeDto: { email: string; name: string; password: string },
    @Request() req,
  ) {
    const organizationId = req.user.role === Role.ADMIN ? +id : req.user.organizationId;
    return this.organizationsService.createEmployee(
      organizationId,
      createEmployeeDto.email,
      createEmployeeDto.name,
      createEmployeeDto.password,
    );
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update organization active status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateDto: { isActive: boolean },
  ) {
    return this.organizationsService.updateStatus(+id, updateDto.isActive);
  }
}
