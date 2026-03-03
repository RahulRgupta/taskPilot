import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Organization, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Self-registration: Organization signs up. Cannot login until admin verifies.
   */
  async registerOrganization(
    name: string,
    email: string,
    password: string,
    address?: string,
    phone?: string,
  ): Promise<Organization> {
    if (!password || password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }
    return this.create(name, email, address, phone, password, false);
  }

  async create(
    name: string,
    email: string,
    address?: string,
    phone?: string,
    password?: string,
    isVerified = true,
  ): Promise<Organization> {
    // Check if organization already exists
    const existingOrg = await this.prisma.organization.findUnique({
      where: { email },
    });
    if (existingOrg) {
      throw new ConflictException('Organization with this email already exists');
    }

    // Check if user with this email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if organization with this phone already exists (when phone is provided)
    if (phone && phone.trim()) {
      const existingByPhone = await this.prisma.organization.findFirst({
        where: { phone: phone.trim() },
      });
      if (existingByPhone) {
        throw new ConflictException('Organization with this phone number already exists');
      }
    }

    // Create organization
    const organization = await this.prisma.organization.create({
      data: {
        name,
        email,
        address,
        phone,
        isVerified,
      },
    });

    // Create organization user account if password is provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await this.prisma.user.create({
        data: {
          email,
          name: name,
          password: hashedPassword,
          role: Role.ORGANIZATION,
          organizationId: organization.id,
        },
      });
    }

    return organization;
  }

  async findAll(): Promise<Organization[]> {
    return this.prisma.organization.findMany({
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      email?: string;
      address?: string;
      phone?: string;
      isActive?: boolean;
    },
  ): Promise<Organization> {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    if (data.email && data.email.trim() !== org.email) {
      const existingOrg = await this.prisma.organization.findUnique({
        where: { email: data.email.trim() },
      });
      if (existingOrg) {
        throw new ConflictException('Organization with this email already exists');
      }
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email.trim() },
      });
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
      // Update the organization user's email too (role ORGANIZATION)
      await this.prisma.user.updateMany({
        where: { organizationId: id, role: Role.ORGANIZATION, email: org.email },
        data: { email: data.email.trim(), name: data.name?.trim() || org.name },
      });
    }

    // Check if organization with this phone already exists (when phone is being changed)
    if (data.phone !== undefined && data.phone?.trim()) {
      const existingByPhone = await this.prisma.organization.findFirst({
        where: {
          phone: data.phone!.trim(),
          id: { not: id },
        },
      });
      if (existingByPhone) {
        throw new ConflictException('Organization with this phone number already exists');
      }
    }

    return this.prisma.organization.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.email !== undefined && { email: data.email.trim() }),
        ...(data.address !== undefined && { address: data.address?.trim() || null }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async findOne(id: number): Promise<Organization | null> {
    return this.prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            joinedAt: true,
            employeeCode: true,
            department: true,
            jobTitle: true,
            phone: true,
          },
        },
      },
    });
  }

  async createManager(
    organizationId: number,
    email: string,
    name: string,
    password: string,
    details?: { joinedAt?: string; employeeCode?: string; department?: string; jobTitle?: string; phone?: string },
  ) {
    return this.createUser(organizationId, email, name, password, Role.MANAGER, details);
  }

  async createEmployee(
    organizationId: number,
    email: string,
    name: string,
    password: string,
    details?: { joinedAt?: string; employeeCode?: string; department?: string; jobTitle?: string; phone?: string },
  ) {
    return this.createUser(organizationId, email, name, password, Role.EMPLOYEE, details);
  }

  /** Create a user (manager or employee) with optional join details */
  async createUser(
    organizationId: number,
    email: string,
    name: string,
    password: string,
    role: 'MANAGER' | 'EMPLOYEE',
    details?: { joinedAt?: string; employeeCode?: string; department?: string; jobTitle?: string; phone?: string },
  ) {
    const organization = await this.findOne(organizationId);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate required fields
    const employeeCode = details?.employeeCode?.trim();
    const department = details?.department?.trim();
    const jobTitle = details?.jobTitle?.trim();
    const phone = details?.phone?.trim();
    if (!employeeCode) {
      throw new BadRequestException('Employee code is required');
    }
    if (!department) {
      throw new BadRequestException('Department is required');
    }
    if (!jobTitle) {
      throw new BadRequestException('Job title is required');
    }
    if (!phone) {
      throw new BadRequestException('Phone is required');
    }

    // Check employee code unique within organization
    const existingByEmployeeCode = await this.prisma.user.findFirst({
      where: {
        organizationId,
        employeeCode,
      },
    });
    if (existingByEmployeeCode) {
      throw new ConflictException('Employee code already exists in this organization');
    }

    // Check phone unique globally
    const existingByPhone = await this.prisma.user.findFirst({
      where: { phone },
    });
    if (existingByPhone) {
      throw new ConflictException('Phone number already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const joinedAt = details?.joinedAt
      ? new Date(details.joinedAt)
      : new Date();

    return this.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        organizationId,
        joinedAt,
        employeeCode,
        department,
        jobTitle,
        phone,
      },
      include: { organization: true },
    });
  }

  async getUsersList(
    organizationId: number,
    params: {
      draw: number;
      start: number;
      length: number;
      search?: string;
      orderColumn?: string;
      orderDir?: string;
      roleFilter?: string;
    },
  ) {
    const { draw, start, length, search, orderColumn, orderDir, roleFilter } = params;

    const where: any = {
      organizationId,
      role: { in: [Role.MANAGER, Role.EMPLOYEE] },
    };

    if (roleFilter === 'MANAGER') {
      where.role = Role.MANAGER;
    } else if (roleFilter === 'EMPLOYEE') {
      where.role = Role.EMPLOYEE;
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { employeeCode: { contains: search, mode: 'insensitive' } },
            { department: { contains: search, mode: 'insensitive' } },
            { jobTitle: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const allowed: Record<string, string> = {
      id: 'id',
      name: 'name',
      email: 'email',
      role: 'role',
      department: 'department',
      jobTitle: 'jobTitle',
      joinedAt: 'joinedAt',
      employeeCode: 'employeeCode',
    };
    const sortField = allowed[orderColumn || ''] || 'id';
    const sortDir = orderDir === 'asc' ? 'asc' : 'desc';

    const baseWhere: any = { organizationId, role: { in: [Role.MANAGER, Role.EMPLOYEE] } };

    const [recordsTotal, recordsFiltered, users] = await Promise.all([
      this.prisma.user.count({ where: baseWhere }),
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { [sortField]: sortDir },
        skip: start,
        ...(length > 0 ? { take: length } : {}),
      }),
    ]);

    const data = users.map((u) => ({
      id: u.id,
      name: u.name || '',
      email: u.email,
      role: u.role,
      employeeCode: u.employeeCode || '—',
      department: u.department || '—',
      jobTitle: u.jobTitle || '—',
      phone: u.phone || '—',
      joinedAt: u.joinedAt ? new Date(u.joinedAt).toLocaleDateString() : '—',
      actions: '',
    }));

    return { draw, recordsTotal, recordsFiltered, data };
  }

  async updateStatus(id: number, isActive: boolean): Promise<Organization> {
    return this.prisma.organization.update({
      where: { id },
      data: { isActive },
    });
  }

  /** Admin verifies organization so they can login */
  async verifyOrganization(id: number): Promise<Organization> {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return this.prisma.organization.update({
      where: { id },
      data: { isVerified: true },
    });
  }

  /** Find a user by id that belongs to the given organization (for edit) */
  async findUserInOrganization(
    userId: number,
    organizationId: number,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
        role: { in: [Role.MANAGER, Role.EMPLOYEE] },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /** Update a manager/employee belonging to the organization */
  async updateUser(
    userId: number,
    organizationId: number,
    data: {
      name: string;
      email: string;
      password?: string;
      role: 'MANAGER' | 'EMPLOYEE';
      joinedAt?: string;
      employeeCode?: string;
      department?: string;
      jobTitle?: string;
      phone?: string;
    },
  ) {
    await this.findUserInOrganization(userId, organizationId);

    const employeeCode = data.employeeCode?.trim();
    const department = data.department?.trim();
    const jobTitle = data.jobTitle?.trim();
    const phone = data.phone?.trim();

    if (!employeeCode) {
      throw new BadRequestException('Employee code is required');
    }
    if (!department) {
      throw new BadRequestException('Department is required');
    }
    if (!jobTitle) {
      throw new BadRequestException('Job title is required');
    }
    if (!phone) {
      throw new BadRequestException('Phone is required');
    }

    const existingByEmail = await this.prisma.user.findFirst({
      where: {
        email: data.email.trim(),
        id: { not: userId },
      },
    });
    if (existingByEmail) {
      throw new ConflictException('User with this email already exists');
    }

    const existingByEmployeeCode = await this.prisma.user.findFirst({
      where: {
        organizationId,
        employeeCode,
        id: { not: userId },
      },
    });
    if (existingByEmployeeCode) {
      throw new ConflictException('Employee code already exists in this organization');
    }

    const existingByPhone = await this.prisma.user.findFirst({
      where: {
        phone,
        id: { not: userId },
      },
    });
    if (existingByPhone) {
      throw new ConflictException('Phone number already exists');
    }

    const updateData: {
      name: string;
      email: string;
      password?: string;
      role: Role;
      joinedAt?: Date;
      employeeCode?: string;
      department?: string;
      jobTitle?: string;
      phone?: string;
    } = {
      name: data.name.trim(),
      email: data.email.trim(),
      role: data.role === 'MANAGER' ? Role.MANAGER : Role.EMPLOYEE,
      joinedAt: data.joinedAt ? new Date(data.joinedAt) : undefined,
      employeeCode,
      department,
      jobTitle,
      phone,
    };

    if (data.password && data.password.length >= 6) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { organization: true },
    });
  }
}
