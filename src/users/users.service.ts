import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { organization: true },
    });
  }

  async create(
    email: string,
    name: string | null,
    hashedPassword: string,
    role: Role = Role.EMPLOYEE,
    organizationId?: number,
  ): Promise<User> {
    return this.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        organizationId,
      },
      include: { organization: true },
    });
  }

  async findByOrganization(organizationId: number): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { organizationId },
      include: { organization: true },
    });
  }

  async findByRole(role: Role, organizationId?: number): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        role,
        ...(organizationId && { organizationId }),
      },
      include: { organization: true },
    });
  }
}

