import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role, TaskStatus } from '@prisma/client';

@Injectable()
export class ManagerService {
  constructor(private prisma: PrismaService) {}

  async getOrganizationForManager(organizationId: number) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        users: {
          where: { role: Role.EMPLOYEE },
          select: { id: true, email: true, name: true, role: true },
        },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async getProjectsByOrganization(organizationId: number) {
    return this.prisma.project.findMany({
      where: { organizationId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        employees: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProject(
    organizationId: number,
    managerId: number,
    name: string,
    description?: string,
    options?: {
      status?: string;
      priority?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const data = {
      name,
      description: description || null,
      organizationId,
      createdById: managerId,
      ...(options?.status && { status: options.status }),
      ...(options?.priority && { priority: options.priority }),
      ...(options?.startDate && { startDate: new Date(options.startDate) }),
      ...(options?.endDate && { endDate: new Date(options.endDate) }),
    };

    return this.prisma.project.create({
      data: data as Prisma.ProjectUncheckedCreateInput,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        employees: true,
      },
    });
  }

  async getProject(projectId: number, organizationId: number) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      include: {
        organization: true,
        createdBy: { select: { id: true, name: true, email: true } },
        employees: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async getEmployeesOfOrganization(organizationId: number) {
    return this.prisma.user.findMany({
      where: { organizationId, role: Role.EMPLOYEE },
      select: { id: true, email: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });
  }

  async getManagersOfOrganization(organizationId: number) {
    return this.prisma.user.findMany({
      where: { organizationId, role: Role.MANAGER },
      select: { id: true, email: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });
  }

  async getProjectsList(
    organizationId: number,
    params: {
      draw: number;
      start: number;
      length: number;
      search?: string;
      orderColumn?: string;
      orderDir?: string;
    },
  ) {
    const { draw, start, length, search, orderColumn, orderDir } = params;

    const where: Prisma.ProjectWhereInput = { organizationId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { createdBy: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const allowed: Record<string, string> = {
      id: 'id',
      name: 'name',
      description: 'description',
      status: 'status',
      priority: 'priority',
      createdAt: 'createdAt',
    };
    const sortField = allowed[orderColumn || ''] || 'id';
    const sortDir = orderDir === 'asc' ? 'asc' : 'desc';

    const [recordsTotal, recordsFiltered, projects] = await Promise.all([
      this.prisma.project.count({ where: { organizationId } }),
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          employees: { select: { id: true } },
        },
        orderBy: { [sortField]: sortDir },
        skip: start,
        ...(length > 0 ? { take: length } : {}),
      }),
    ]);

    const data = projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || '—',
      status: (p as any).status || 'PLANNING',
      priority: (p as any).priority || 'MEDIUM',
      createdByName: p.createdBy?.name || p.createdBy?.email || '—',
      employeesCount: p.employees ? p.employees.length : 0,
      createdAt: new Date(p.createdAt).toLocaleDateString(),
      actions: '',
    }));

    return { draw, recordsTotal, recordsFiltered, data };
  }

  async assignEmployeesToProject(
    projectId: number,
    organizationId: number,
    employeeIds: number[],
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) throw new NotFoundException('Project not found');

    // Allow both MANAGER and EMPLOYEE to be assigned to the project
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: employeeIds },
        organizationId,
        role: { in: [Role.MANAGER, Role.EMPLOYEE] },
      },
      select: { id: true },
    });
    const validIds = users.map((e) => e.id);

    await this.prisma.projectEmployee.deleteMany({
      where: { projectId },
    });

    if (validIds.length > 0) {
      await this.prisma.projectEmployee.createMany({
        data: validIds.map((userId) => ({ projectId, userId })),
        skipDuplicates: true,
      });
    }

    return this.getProject(projectId, organizationId);
  }

  // ── Tasks ──────────────────────────────────────────────────────

  async getTasksByProject(projectId: number, organizationId: number) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.task.findMany({
      where: { projectId },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createTask(
    projectId: number,
    organizationId: number,
    createdById: number,
    data: { title: string; description?: string; assignedToId: number; assignDate?: string; dueDate?: string },
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const assignee = await this.prisma.user.findFirst({
      where: { id: data.assignedToId, organizationId },
    });
    if (!assignee) throw new NotFoundException('Assigned user not found in this organization');

    return this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description || null,
        projectId,
        assignedToId: data.assignedToId,
        createdById,
        assignDate: data.assignDate ? new Date(data.assignDate) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: TaskStatus.ASSIGNED,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async updateTaskStatus(
    taskId: number,
    organizationId: number,
    status: TaskStatus,
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, project: { organizationId } },
    });
    if (!task) throw new NotFoundException('Task not found');

    return this.prisma.task.update({
      where: { id: taskId },
      data: { status },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async deleteTask(taskId: number, organizationId: number) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, project: { organizationId } },
    });
    if (!task) throw new NotFoundException('Task not found');

    return this.prisma.task.delete({ where: { id: taskId } });
  }

  async getProjectMembers(projectId: number, organizationId: number) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
      include: {
        employees: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project.employees.map((pe) => pe.user);
  }
}
