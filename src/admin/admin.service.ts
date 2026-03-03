import { Injectable } from '@nestjs/common';
import { OrganizationsService } from '../organizations/organizations.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private organizationsService: OrganizationsService,
    private prisma: PrismaService,
  ) {}

  async getDashboardStats() {
    const [organizations, users, managers, employees] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'MANAGER' } }),
      this.prisma.user.count({ where: { role: 'EMPLOYEE' } }),
    ]);

    return {
      organizations,
      users,
      managers,
      employees,
    };
  }

  async getAllOrganizations() {
    return this.organizationsService.findAll();
  }

  async getOrganization(id: number) {
    return this.organizationsService.findOne(id);
  }

  async getOrganizationsList(params: {
    draw: number;
    start: number;
    length: number;
    search?: string;
    orderColumn?: string;
    orderDir?: string;
    statusFilter?: string;
  }) {
    const { draw, start, length, search, orderColumn, orderDir, statusFilter } =
      params;

    const where: Prisma.OrganizationWhereInput = {};

    if (statusFilter === 'active') {
      where.isActive = true;
    } else if (statusFilter === 'inactive') {
      where.isActive = false;
    } else if (statusFilter === 'pending') {
      where.isVerified = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const allowedColumns: Record<string, string> = {
      id: 'id',
      name: 'name',
      email: 'email',
      phone: 'phone',
      address: 'address',
      status: 'isActive',
      createdAt: 'createdAt',
    };

    const sortField = allowedColumns[orderColumn || ''] || 'id';
    const sortDir = orderDir === 'asc' ? 'asc' : 'desc';

    const [recordsTotal, recordsFiltered, organizations] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({
        where,
        include: {
          users: { select: { id: true, role: true } },
        },
        orderBy: { [sortField]: sortDir },
        skip: start,
        ...(length > 0 ? { take: length } : {}),
      }),
    ]);

    const data = organizations.map((org) => ({
      id: org.id,
      name: org.name,
      email: org.email,
      phone: org.phone || '—',
      address: org.address || '—',
      usersCount: org.users ? org.users.length : 0,
      status: org.isActive ? 'Active' : 'Inactive',
      isActive: org.isActive,
      isVerified: (org as any).isVerified ?? true,
      createdAt: new Date(org.createdAt).toLocaleDateString(),
      actions: '',
    }));

    return { draw, recordsTotal, recordsFiltered, data };
  }
}
