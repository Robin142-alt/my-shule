import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SIDEBAR_WORKSPACE_SCHEMA_SQL } from './sidebar-workspace-schema';

/** Complete the read contracts after the owning modules have initialized their tables. */
@Injectable()
export class SidebarWorkspaceSchemaService implements OnApplicationBootstrap {
  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.prisma.runSchemaBootstrap(SIDEBAR_WORKSPACE_SCHEMA_SQL);
  }
}
