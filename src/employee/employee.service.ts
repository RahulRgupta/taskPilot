import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskStatus } from '@prisma/client';

@Injectable()
export class EmployeeService {
  constructor(private prisma: PrismaService) {}

  async getAssignedProjects(userId: number) {
    const assignments = await this.prisma.projectEmployee.findMany({
      where: { userId },
      include: {
        project: {
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
            employees: { select: { id: true } },
            _count: { select: { tasks: true } },
          },
        },
      },
      orderBy: { project: { createdAt: 'desc' } },
    });
    return assignments.map((a) => a.project);
  }

  async getTasksByProject(projectId: number, userId: number) {
    const assignment = await this.prisma.projectEmployee.findFirst({
      where: { projectId, userId },
    });
    if (!assignment) throw new NotFoundException('You are not assigned to this project');

    return this.prisma.task.findMany({
      where: { projectId },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateTaskStatus(taskId: number, userId: number, organizationId: number, status: TaskStatus) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        project: { organizationId },
      },
      include: { project: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    const assignment = await this.prisma.projectEmployee.findFirst({
      where: { projectId: task.projectId, userId },
    });
    if (!assignment) throw new NotFoundException('You are not assigned to this project');

    return this.prisma.task.update({
      where: { id: taskId },
      data: { status },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async getProjectForEmployee(projectId: number, userId: number) {
    const assignment = await this.prisma.projectEmployee.findFirst({
      where: { projectId, userId },
    });
    if (!assignment) throw new NotFoundException('You are not assigned to this project');

    return this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        employees: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        },
      },
    });
  }
}
