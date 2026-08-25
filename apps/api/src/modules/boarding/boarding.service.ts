import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { SimpleOperationsService, SimpleOperationsRecordDto } from '../implementation100/simple-operations';
import { BoardingRepository } from './repositories/boarding.repository';
import { SchoolOperationalEventsService } from '../events/school-operational-events.service';
import { CreateBoardingReferralDto } from './dto/legacy-boarding.dto';

@Injectable()
export class BoardingService extends SimpleOperationsService {
  constructor(
    private readonly requestCtx: RequestContextService,
    private readonly boardingRepository: BoardingRepository,
    @Optional() private readonly schoolEvents?: SchoolOperationalEventsService,
  ) {
    super(requestCtx, boardingRepository, {
      permissionPrefix: 'boarding',
      moduleName: 'Boarding',
      entityName: 'boarding',
      defaultStatus: 'active',
    });
  }

  async createReferral(dto: CreateBoardingReferralDto) {
    const context = this.requireWriteContext();
    const reason = this.requireBoardingText(dto.reason, 'Referral reason');
    const referredTo = dto.referred_to ?? 'boarding_master';
    const referral = await this.boardingRepository.createReferral({
      tenant_id: context.tenantId,
      student_id: dto.student_id,
      reason,
      referred_to: referredTo,
      created_by: context.userId,
      actor_role: context.role,
    });
    if (!referral) {
      throw new NotFoundException('The selected active boarder was not found in this school');
    }

    return {
      success: true,
      message: 'Boarding referral created, audited, and queued for follow-up',
      referral,
    };
  }

  override async createRecord(dto: SimpleOperationsRecordDto) {
    const normalizedCategory = String(dto.category ?? '').trim().toLowerCase();
    const normalizedTitle = String(dto.title ?? '').trim();
    const isLateReturn = normalizedCategory === 'late_return'
      || normalizedTitle.toLowerCase().includes('late return');
    if (!isLateReturn) {
      return super.createRecord(dto);
    }

    const context = this.requireWriteContext();
    if (!normalizedTitle) {
      throw new BadRequestException('boarding title is required');
    }
    const studentId = this.requireBoardingText(dto.metadata?.student_id, 'Student');
    const metricCount = dto.metric_count == null ? 0 : Number(dto.metric_count);
    if (!Number.isFinite(metricCount) || metricCount < 0) {
      throw new BadRequestException('boarding metric cannot be negative');
    }
    const notes = this.optionalBoardingText(dto.notes);
    const record = await this.boardingRepository.createLateReturnRecord({
      tenant_id: context.tenantId,
      student_id: studentId,
      title: normalizedTitle,
      owner_name: this.optionalBoardingText(dto.owner_name),
      status: this.optionalBoardingText(dto.status) ?? 'active',
      priority: this.optionalBoardingText(dto.priority) ?? 'normal',
      due_date: this.optionalBoardingText(dto.due_date),
      metric_count: metricCount,
      notes,
      metadata: { ...(dto.metadata ?? {}), student_id: studentId },
      created_by_user_id: context.userId,
    });
    if (!record) {
      throw new BadRequestException('The selected learner is not active in this school');
    }

    const deliveryReasons: string[] = [];
    let guardianCount = 0;
    let guardianNotificationCount = 0;
    try {
      const guardianDelivery = await this.boardingRepository.notifyLateReturnGuardians({
        tenant_id: context.tenantId,
        student_id: studentId,
        record_id: record.id,
        title: 'Boarding late return recorded',
        body: `${record.student_name} was logged for a late return to boarding.${notes ? ` ${notes}` : ''}`,
      });
      guardianCount = Number(guardianDelivery.guardian_count ?? 0);
      guardianNotificationCount = Number(guardianDelivery.notification_count ?? 0);
      if (guardianCount === 0) {
        deliveryReasons.push('no_active_guardian_account');
      } else if (guardianNotificationCount !== guardianCount) {
        deliveryReasons.push('guardian_notification_incomplete');
      }
    } catch {
      deliveryReasons.push('guardian_notification_failed');
    }

    let staffEventStatus: 'accepted' | 'failed' | 'unavailable' = 'unavailable';
    if (this.schoolEvents) {
      try {
        await this.schoolEvents.recordSchoolOperation({
          event: {
            id: record.id,
            type: 'boarding.late_return',
            module: 'boarding',
            actorRole: context.role,
            title: 'Late Return Logged',
            body: `Late return logged for ${record.student_name}.`,
            entityId: record.id,
            severity: 'warning',
            payload: { category: 'late_return', student_id: studentId },
          },
          notifications: [
            {
              id: `boarding-late-staff-${record.id}`,
              schoolId: context.tenantId,
              audienceRoles: ['boarding_master', 'discipline_master'],
              title: 'Student Late Return',
              body: `Late return logged for ${record.student_name}.${notes ? ` ${notes}` : ''}`,
              sourceModule: 'boarding',
              relatedModule: 'discipline',
              relatedRecordId: record.id,
              priority: 'high',
              read: false,
              createdAt: new Date().toISOString(),
            },
          ],
        });
        staffEventStatus = 'accepted';
      } catch {
        staffEventStatus = 'failed';
        deliveryReasons.push('staff_event_failed');
      }
    } else {
      deliveryReasons.push('staff_event_unavailable');
    }

    return {
      ...record,
      delivery: {
        status: deliveryReasons.length === 0 ? 'complete' : 'degraded',
        guardian_count: guardianCount,
        guardian_notification_count: guardianNotificationCount,
        guardian_recipient_scope: 'exact_linked_guardian_users',
        staff_event_status: staffEventStatus,
        reasons: deliveryReasons,
      },
    };
  }

  override async getDashboard() {
    const baseDashboard = await super.getDashboard();
    const tenantId = this.requestCtx.requireStore().tenant_id;
    const metrics = await this.boardingRepository.getOperationalMetrics(tenantId!);

    return {
      ...baseDashboard,
      ...metrics,
    };
  }

  private requireWriteContext(): { tenantId: string; userId: string; role: string } {
    const store = this.requestCtx.getStore();
    const tenantId = store?.tenant_id;
    const userId = store?.user_id;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for Boarding operations');
    }
    if (!userId) {
      throw new UnauthorizedException('Authenticated user is required for Boarding operations');
    }
    const permissions = store?.permissions ?? [];
    if (!permissions.includes('*:*') && !permissions.includes('boarding:write') && !permissions.includes('boarding:*')) {
      throw new ForbiddenException('Boarding permission is required');
    }
    return { tenantId, userId, role: store?.role || 'boarding_master' };
  }

  private requireBoardingText(value: unknown, label: string): string {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized) {
      throw new BadRequestException(`${label} is required`);
    }
    return normalized;
  }

  private optionalBoardingText(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }
}
