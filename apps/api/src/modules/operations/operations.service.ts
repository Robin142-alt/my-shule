import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { CreateEmergencyDto, CreateAlertDto, CreateReportDto } from './operations.dto';

@Injectable()
export class OperationsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly requestContext: RequestContextService,
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

  async reportEmergency(dto: CreateEmergencyDto) {
    const result = await this.db.query(
      `INSERT INTO operations_emergencies (tenant_id, title, description, severity, reported_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [this.tenantId, dto.title, dto.description, dto.severity, this.userId]
    );
    return result.rows[0];
  }

  async createAlert(dto: CreateAlertDto) {
    const result = await this.db.query(
      `INSERT INTO operations_alerts (tenant_id, title, description, severity, reported_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [this.tenantId, dto.title, dto.description, dto.severity, this.userId]
    );
    return result.rows[0];
  }

  async submitReport(dto: CreateReportDto) {
    const result = await this.db.query(
      `INSERT INTO operations_reports (tenant_id, title, content, prepared_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [this.tenantId, dto.title, dto.content, this.userId]
    );
    return result.rows[0];
  }
}
