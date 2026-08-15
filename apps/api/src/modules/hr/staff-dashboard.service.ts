import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { HrRepository } from './repositories/hr.repository';

@Injectable()
export class StaffDashboardService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly repository: HrRepository,
  ) {}

  private requireUserId(): string {
    const userId = this.requestContext.getStore()?.user_id;
    if (!userId) {
      throw new UnauthorizedException('User context is required');
    }
    return userId;
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
    const store = this.requestContext.requireStore();
    const userId = this.requireUserId();

    return this.repository.getStaffDashboard(
      tenantId,
      userId,
      store.role ?? '',
    );
  }
}
