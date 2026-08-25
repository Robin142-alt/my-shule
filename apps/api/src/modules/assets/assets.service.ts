import { Injectable, Logger, Optional } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { SimpleOperationsService, SimpleOperationsRecordDto, SimpleOperationsStatusDto } from '../implementation100/simple-operations';
import { AssetsRepository } from './repositories/assets.repository';
import { SchoolOperationalEventsService } from '../events/school-operational-events.service';

@Injectable()
export class AssetsService extends SimpleOperationsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    private readonly requestCtx: RequestContextService,
    repository: AssetsRepository,
    @Optional() private readonly schoolEvents?: SchoolOperationalEventsService,
  ) {
    super(requestCtx, repository, {
      permissionPrefix: 'assets',
      moduleName: 'Asset Tracking',
      entityName: 'assets',
      defaultStatus: 'active',
    });
  }

  private async notifyIfFaulty(
    id: string,
    recordOrStatus: SimpleOperationsRecordDto | SimpleOperationsStatusDto,
  ): Promise<{ status: 'not_required' | 'sent' | 'degraded'; message?: string }> {
    const isFaulty = 'status' in recordOrStatus 
      ? (recordOrStatus as SimpleOperationsStatusDto).status === 'faulty' 
      : (recordOrStatus as SimpleOperationsRecordDto).category === 'fault';
    
    if (isFaulty) {
      if (!this.schoolEvents) {
        return { status: 'degraded', message: 'The school communication service is unavailable.' };
      }

      try {
        await this.schoolEvents.recordSchoolOperation({
          event: {
            id,
            type: 'asset.fault_reported',
            module: 'assets',
            actorRole: this.requestCtx.getStore()?.role || 'staff',
            title: 'Asset Fault Reported',
            body: 'An asset fault was reported or status updated to faulty.',
            entityId: id,
            severity: 'error',
            payload: { status: 'faulty' },
          },
          notifications: [
            {
              id: `asset-fault-${id}`,
              schoolId: this.requestCtx.getStore()?.tenant_id || 'unknown',
              audienceRoles: ['ict_manager', 'admin'],
              title: 'Unresolved Asset Fault',
              body: 'An asset requires attention due to a reported fault.',
              sourceModule: 'assets',
              relatedModule: 'assets',
              relatedRecordId: id,
              priority: 'high',
              read: false,
              createdAt: new Date().toISOString(),
            },
          ],
        });
        return { status: 'sent' };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Asset ${id} was saved, but its fault alert could not be queued: ${message}`);
        return {
          status: 'degraded',
          message: 'The asset was saved, but its cross-dashboard fault alert could not be queued.',
        };
      }
    }

    return { status: 'not_required' };
  }

  override async createRecord(dto: SimpleOperationsRecordDto) {
    const record = await super.createRecord(dto);
    const communication = await this.notifyIfFaulty(record.id, dto);
    return { ...record, communication };
  }

  override async updateStatus(recordId: string, dto: SimpleOperationsStatusDto) {
    const record = await super.updateStatus(recordId, dto);
    const communication = await this.notifyIfFaulty(recordId, dto);
    return { ...record, communication };
  }
}
