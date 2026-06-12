import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { CreateEmergencyDto, CreateAlertDto, CreateReportDto } from './operations.dto';

@Injectable()
export class OperationsService {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);
    
    if (isUuid) {
      return this.prisma.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await this.prisma.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }

  constructor(private readonly prisma: PrismaService, private readonly db: PrismaService,
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
