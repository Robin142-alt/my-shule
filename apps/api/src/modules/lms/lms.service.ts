import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { SimpleOperationsService } from '../implementation100/simple-operations';
import { SubmitLmsAssignmentDto } from './dto/lms-submission.dto';
import { LmsRepository } from './repositories/lms.repository';

@Injectable()
export class LmsService extends SimpleOperationsService {
  constructor(
    private readonly requestContextService: RequestContextService,
    private readonly lmsRepository: LmsRepository,
  ) {
    super(requestContextService, lmsRepository, {
      permissionPrefix: 'lms',
      moduleName: 'LMS',
      entityName: 'lms',
      defaultStatus: 'open',
    });
  }

  async submitAssignment(assignmentId: string, dto: SubmitLmsAssignmentDto) {
    const tenantId = this.requireLmsTenantId();
    const assignment = await this.lmsRepository.findAssignment(tenantId, assignmentId);

    if (!assignment) {
      throw new BadRequestException('LMS assignment was not found for the current school');
    }

    if (['closed', 'archived', 'locked'].includes(String(assignment.status).toLowerCase())) {
      throw new BadRequestException('LMS assignment is not accepting submissions');
    }

    const status = this.normalizeSubmissionStatus(dto.status);
    const submission = await this.lmsRepository.createAssignmentSubmission({
      tenant_id: tenantId,
      assignment_id: assignmentId,
      student_id: dto.student_id,
      status,
      submitted_by_user_id: this.getLmsActorUserId(),
      metadata: {
        answer_text: dto.answer_text?.trim() || null,
        attachment_url: dto.attachment_url?.trim() || null,
        assignment_title: assignment.title,
      },
    });

    await this.lmsRepository.appendAuditLog({
      tenant_id: tenantId,
      actor_user_id: this.getLmsActorUserId(),
      action: 'lms.assignment.submitted',
      resource_type: 'lms_submission',
      resource_id: submission?.id ?? null,
      metadata: {
        assignment_id: assignmentId,
        student_id: dto.student_id,
        status,
      },
    });

    return submission;
  }

  private normalizeSubmissionStatus(value: string | undefined): string {
    const normalized = value?.trim().toLowerCase() || 'submitted';

    if (!['submitted', 'resubmitted', 'draft'].includes(normalized)) {
      throw new BadRequestException('Unsupported LMS submission status');
    }

    return normalized;
  }

  private requireLmsTenantId(): string {
    const tenantId = this.requestContextService.getStore()?.tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for LMS operations');
    }

    return tenantId;
  }

  private getLmsActorUserId(): string | null {
    const userId = this.requestContextService.getStore()?.user_id;
    return userId && userId !== 'anonymous' ? userId : null;
  }
}
