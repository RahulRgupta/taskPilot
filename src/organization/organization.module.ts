import { Module } from '@nestjs/common';
import { OrganizationController } from './organization.controller';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AuthModule } from '../auth/auth.module';
import { ManagerModule } from '../manager/manager.module';

@Module({
  imports: [OrganizationsModule, AuthModule, ManagerModule],
  controllers: [OrganizationController],
})
export class OrganizationModule {}
