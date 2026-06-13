import { Injectable, Optional, InternalServerErrorException } from '@nestjs/common';
import { SchoolOperationalEventsService } from '../events/school-operational-events.service';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { VisitorsService } from '../visitors/visitors.service';
import { CreateSecurityIncidentDto, CreatePanicAlertDto, CreateVisitorDto } from './security-operations.dto';

@Injectable()
export class SecurityOperationsService {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);

    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    
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
    private readonly visitorsService: VisitorsService,
    @Optional() private readonly schoolEvents?: SchoolOperationalEventsService,
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
    const record = await this.visitorsService.logVisitor(dto);
    await this.schoolEvents?.recordSchoolOperation({
      event: {
        id: record.id,
        type: 'security.visitor_created',
        module: 'security',
        actorRole: this.requestContext.getStore()?.role || 'staff',
        title: 'Visitor Record Created',
        body: `A visitor record was created for ${dto.visitor_name}`,
        entityId: record.id,
        severity: 'info',
        payload: { visitor_name: dto.visitor_name },
      },
    });
    return record;
  }
}
