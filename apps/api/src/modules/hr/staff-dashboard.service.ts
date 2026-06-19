import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';

@Injectable()
export class StaffDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  private requireStaffId(): string {
    const userId = this.requestContext.getStore()?.user_id;
    if (!userId) {
      throw new UnauthorizedException('User context is required');
    }
    return userId; // In a real scenario we'd map userId to staff_profile_id
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.requireStore().tenant_id;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }
    return tenantId;
  }

  async getStaffDashboard() {
    const tenantId = this.requireTenantId();
    const userId = this.requireStaffId();

    // Ideally, we'd query for the staff profile associated with the user
    // For now, let's just return a standard dashboard structure
    return {
      metrics: {
        upcomingClasses: 2,
        pendingTasks: 5,
        unreadMessages: 3,
        leaveBalance: 14
      },
      schedule: [],
      announcements: [],
      recentActivity: []
    };
  }
}
