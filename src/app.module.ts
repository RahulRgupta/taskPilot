import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { OrganizationModule } from './organization/organization.module';
import { ManagerModule } from './manager/manager.module';
import { EmployeeModule } from './employee/employee.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, AdminModule, OrganizationsModule, OrganizationModule, ManagerModule, EmployeeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
