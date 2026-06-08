import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { VisitorsService } from '../visitors/visitors.service';
import { CreateSecurityIncidentDto, CreatePanicAlertDto, CreateVisitorDto } from './security-operations.dto';

@Injectable()
export class SecurityOperationsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly visitorsService: VisitorsService,
  ) {}

  private get tenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;
    if (!tenantId) throw new InternalServerErrorException('Tenant ID is required');
    return tenantId;
  }

  private get userId(): string {
    const userId = this.requestContext.getStore()?.user_id;
    if (!userId) throw new InternalServerErrorException('User ID is required');
    return userId;
  }

  async reportIncident(dto: CreateSecurityIncidentDto) {
    const result = await this.db.query(
      `INSERT INTO security_incidents (tenant_id, title, description, severity, location, reported_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [this.tenantId, dto.title, dto.description, dto.severity, dto.location, this.userId]
    );
    return result.rows[0];
  }

  async triggerPanicAlert(dto: CreatePanicAlertDto) {
    const result = await this.db.query(
      `INSERT INTO security_panic_alerts (tenant_id, location, triggered_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [this.tenantId, dto.location, this.userId]
    );
    return result.rows[0];
  }

  async createVisitorRecord(dto: CreateVisitorDto) {
    // Proxy to visitor service
    return this.visitorsService.createRecord(dto);
  }
}
