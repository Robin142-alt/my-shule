import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import type {
  AcceptInviteDto,
  ApproveLeaveRequestDto,
  ApproveStaffContractDto,
  ApproveStaffDto,
  AssignRoleDto,
  ChangeStaffStatusDto,
  CompleteProfileDto,
  CreateDepartmentDto,
  CreateDisciplinaryRecordDto,
  CreateJobTitleDto,
  CreatePayrollBandDto,
  CreatePerformanceReviewDto,
  GeneratePayslipDto,
  GetLeaveRequestsDto,
  GetStaffAttendanceDto,
  InviteStaffDto,
  MarkStaffAttendanceDto,
  ReactivateStaffDto,
  RequestLeaveDto,
  SetStaffSalaryDto,
  UpdateLeaveStatusDto,
  UploadStaffDocumentDto,
  VerifyStaffDocumentDto,
} from './dto/hr.dto';
import { HrRepository } from './repositories/hr.repository';
import { EventPublisherService } from '../events/event-publisher.service';
import { AgpExecutionService } from '../../common/platform-governance/agp-execution.service';

@Injectable()
export class HrService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly hrRepository: HrRepository,
    private readonly eventPublisher?: EventPublisherService,
    private readonly agp?: AgpExecutionService,
  ) {}

  async inviteStaff(dto: InviteStaffDto) {
    if (!this.agp) throw new Error('AGP Execution Service is required for this operation');

    return this.agp.execute({
      actionName: 'STAFF_INVITED',
      requiredCapability: 'hr:write',
      aggregateType: 'STAFF',
      aggregateId: dto.email,
      handler: async () => {
        const tenantId = this.requireTenantId();
        const profile = await this.hrRepository.createStaffProfile({
          ...dto,
          tenant_id: tenantId,
          status: 'invited',
        });

        await this.hrRepository.appendAuditLog({
          tenant_id: tenantId,
          staff_profile_id: profile.id,
          actor_user_id: this.getActorUserId(),
          action: 'staff.invited',
          metadata: { email: dto.email, display_name: dto.display_name },
        });

        return profile;
      },
    });
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const tenantId = this.requireTenantId();
    const profile = await this.hrRepository.updateStaffProfile({
      tenant_id: tenantId,
      staff_profile_id: dto.staff_profile_id,
      status: 'profile_incomplete',
    });

    await this.hrRepository.appendAuditLog({
      tenant_id: tenantId,
      staff_profile_id: dto.staff_profile_id,
      actor_user_id: this.getActorUserId(),
      action: 'staff.invite_accepted',
    });

    return profile;
  }

  async completeProfile(dto: CompleteProfileDto) {
    const tenantId = this.requireTenantId();
    const profile = await this.hrRepository.updateStaffProfile({
      tenant_id: tenantId,
      staff_profile_id: dto.staff_profile_id,
      statutory_identifiers: dto.statutory_identifiers,
      emergency_contact: dto.emergency_contact,
      status: 'pending_approval',
    });

    await this.hrRepository.appendAuditLog({
      tenant_id: tenantId,
      staff_profile_id: dto.staff_profile_id,
      actor_user_id: this.getActorUserId(),
      action: 'staff.profile_completed',
    });

    return profile;
  }

  async approveStaff(dto: ApproveStaffDto) {
    if (!this.agp) throw new Error('AGP Execution Service is required for this operation');

    return this.agp.execute({
      actionName: 'STAFF_APPROVED',
      requiredCapability: 'hr:write',
      aggregateType: 'STAFF',
      aggregateId: dto.staff_profile_id,
      eventName: 'staff.updated',
      eventPayload: {
        tenant_id: this.requireTenantId(),
        staff_id: dto.staff_profile_id,
        updated_fields: ['status', 'staff_number'],
        updated_by: this.getActorUserId(),
      },
      handler: async () => {
        const tenantId = this.requireTenantId();
        const profile = await this.hrRepository.approveStaffProfile({
          tenant_id: tenantId,
          staff_profile_id: dto.staff_profile_id,
          staff_number: dto.staff_number,
          status: 'active',
        });

        // Also approve the initial contract
        await this.approveContract({
          ...dto.contract,
          staff_profile_id: dto.staff_profile_id,
          approval_state: 'approved',
        });

        await this.hrRepository.appendAuditLog({
          tenant_id: tenantId,
          staff_profile_id: dto.staff_profile_id,
          actor_user_id: this.getActorUserId(),
          action: 'staff.approved',
          metadata: { staff_number: dto.staff_number },
        });

        return profile;
      },
    });
  }

  async reactivateStaff(dto: ReactivateStaffDto) {
    const tenantId = this.requireTenantId();
    const profile = await this.hrRepository.changeStaffStatus({
      tenant_id: tenantId,
      staff_profile_id: dto.staff_profile_id,
      status: 'active',
      reason: dto.reason ?? 'reactivated',
    });

    await this.hrRepository.appendAuditLog({
      tenant_id: tenantId,
      staff_profile_id: dto.staff_profile_id,
      actor_user_id: this.getActorUserId(),
      action: 'staff.reactivated',
      metadata: { reason: dto.reason },
    });

    return profile;
  }

  async approveContract(dto: ApproveStaffContractDto) {
    const tenantId = this.requireTenantId();
    const overlap = await this.hrRepository.findOverlappingActiveContract(tenantId, dto);

    if (overlap) {
      throw new BadRequestException('Staff member already has an overlapping active contract');
    }

    const contract = await this.hrRepository.approveContract({
      ...dto,
      tenant_id: tenantId,
      approved_by_user_id: this.getActorUserId(),
    });

    await this.hrRepository.appendAuditLog({
      tenant_id: tenantId,
      staff_profile_id: dto.staff_profile_id,
      actor_user_id: this.getActorUserId(),
      action: 'staff.contract.approved',
      metadata: { role_title: dto.role_title, starts_on: dto.starts_on },
    });

    return contract;
  }

  async requestLeave(dto: RequestLeaveDto) {
    const tenantId = this.requireTenantId();
    
    const leave = await this.hrRepository.requestLeave({
      tenant_id: tenantId,
      staff_profile_id: dto.staff_profile_id,
      leave_type: dto.leave_type,
      requested_days: dto.requested_days,
      reason: dto.reason,
    });

    await this.hrRepository.appendAuditLog({
      tenant_id: tenantId,
      staff_profile_id: dto.staff_profile_id,
      actor_user_id: this.getActorUserId(),
      action: 'staff.leave.requested',
      metadata: { leave_type: dto.leave_type, requested_days: dto.requested_days },
    });

    return leave;
  }

  async listLeaveRequests(dto: GetLeaveRequestsDto) {
    const tenantId = this.requireTenantId();
    return this.hrRepository.listLeaveRequests(tenantId, dto.status);
  }

  async updateLeaveStatus(id: string, dto: UpdateLeaveStatusDto) {
    const tenantId = this.requireTenantId();
    const actorId = this.getActorUserId();

    const leaveRequest = await this.hrRepository.getLeaveRequestById(tenantId, id);
    if (!leaveRequest) {
      throw new BadRequestException('Leave request not found');
    }

    if (dto.status === 'approved') {
      const balance = await this.hrRepository.findLeaveBalance(
        tenantId,
        leaveRequest.staff_profile_id,
        leaveRequest.leave_type,
      );

      if (Number(balance.available_days) < Number(leaveRequest.requested_days) && !dto.reason) {
        throw new BadRequestException('Leave approval beyond balance requires an override reason');
      }
    }

    const updated = await this.hrRepository.updateLeaveRequestStatus(
      tenantId,
      id,
      dto.status,
      dto.reason,
      actorId,
    );

    await this.hrRepository.appendAuditLog({
      tenant_id: tenantId,
      staff_profile_id: leaveRequest.staff_profile_id,
      actor_user_id: actorId,
      action: `staff.leave.${dto.status}`,
      metadata: { leave_request_id: id, reason: dto.reason },
    });

    return updated;
  }

  async approveLeave(dto: ApproveLeaveRequestDto) {
    // Legacy support, if any old code calls this
    const tenantId = this.requireTenantId();
    const balance = await this.hrRepository.findLeaveBalance(
      tenantId,
      dto.staff_profile_id,
      dto.leave_type,
    );

    if (Number(balance.available_days) < Number(dto.requested_days) && !dto.override_reason) {
      throw new BadRequestException('Leave approval beyond balance requires an override reason');
    }

    const leave = await this.hrRepository.approveLeaveRequest({
      tenant_id: tenantId,
      staff_profile_id: dto.staff_profile_id,
      leave_type: dto.leave_type,
      requested_days: dto.requested_days,
      override_reason: dto.override_reason,
      approved_by_user_id: this.getActorUserId(),
    });

    await this.hrRepository.appendAuditLog({
      tenant_id: tenantId,
      staff_profile_id: dto.staff_profile_id,
      actor_user_id: this.getActorUserId(),
      action: 'staff.leave.approved',
      metadata: {
        leave_type: dto.leave_type,
        requested_days: dto.requested_days,
        override_reason: dto.override_reason,
      },
    });

    return leave;
  }

  async changeStaffStatus(dto: ChangeStaffStatusDto) {
    const tenantId = this.requireTenantId();
    const staff = await this.hrRepository.changeStaffStatus({
      ...dto,
      tenant_id: tenantId,
    });

    await this.hrRepository.appendAuditLog({
      tenant_id: tenantId,
      staff_profile_id: dto.staff_profile_id,
      actor_user_id: this.getActorUserId(),
      action: 'staff.status.changed',
      metadata: {
        status: dto.status,
        reason: dto.reason,
      },
    });

    return staff;
  }

  async listStaffDirectory(query: Record<string, string | undefined> = {}) {
    const search = this.optionalText(query.search);
    const rows = await this.hrRepository.listStaffDirectory({
      tenant_id: this.requireTenantId(),
      search: search && search.length >= 2 ? search : undefined,
      status: this.optionalText(query.status),
      limit: this.parsePageLimit(query.limit),
      offset: this.parsePageOffset(query.offset),
    });

    return rows.map((row: Record<string, unknown>) => {
      const {
        statutory_identifiers: _statutoryIdentifiers,
        emergency_contact: _emergencyContact,
        ...publicRow
      } = row;

      return publicRow;
    });
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for HR operations');
    }

    return tenantId;
  }

  private getActorUserId(): string | null {
    const userId = this.requestContext.getStore()?.user_id;
    return userId && userId !== 'anonymous' ? userId : null;
  }

  private optionalText(value: string | undefined): string | undefined {
    const normalized = value?.trim() ?? '';
    return normalized || undefined;
  }

  private parsePageLimit(value: string | undefined): number {
    const numeric = Number(value);

    if (!Number.isFinite(numeric) || numeric <= 0) {
      return 25;
    }

    return Math.min(Math.floor(numeric), 50);
  }

  private parsePageOffset(value: string | undefined): number {
    const numeric = Number(value);

    if (!Number.isFinite(numeric) || numeric < 0) {
      return 0;
    }

    return Math.floor(numeric);
  }

  async getDailyStaffAttendance(dto: GetStaffAttendanceDto) {
    const tenantId = this.requireTenantId();
    return this.hrRepository.getStaffAttendance(tenantId, dto.date);
  }

  async markStaffAttendance(dto: MarkStaffAttendanceDto) {
    const tenantId = this.requireTenantId();
    const attendance = await this.hrRepository.upsertStaffAttendance({
      tenant_id: tenantId,
      staff_profile_id: dto.staff_profile_id,
      date: dto.date,
      status: dto.status,
      notes: dto.notes,
    });

    await this.hrRepository.appendAuditLog({
      tenant_id: tenantId,
      staff_profile_id: dto.staff_profile_id,
      actor_user_id: this.getActorUserId(),
      action: 'staff.attendance.marked',
      metadata: { date: dto.date, status: dto.status, notes: dto.notes },
    });

    return attendance;
  }

  async uploadDocument(dto: UploadStaffDocumentDto) {
    const tenantId = this.requireTenantId();

    const doc = await this.hrRepository.uploadStaffDocument({
      tenant_id: tenantId,
      staff_profile_id: dto.staff_profile_id,
      document_type: dto.document_type,
      stored_path: dto.stored_path,
      expires_on: dto.expires_on,
    });

    await this.hrRepository.appendAuditLog({
      tenant_id: tenantId,
      staff_profile_id: dto.staff_profile_id,
      actor_user_id: this.getActorUserId(),
      action: 'staff.document.uploaded',
      metadata: { document_type: dto.document_type, document_id: doc.id },
    });

    return doc;
  }

  async listDocuments(staffProfileId: string) {
    const tenantId = this.requireTenantId();
    return this.hrRepository.listStaffDocuments(tenantId, staffProfileId);
  }

  async verifyDocument(documentId: string, dto: VerifyStaffDocumentDto) {
    const tenantId = this.requireTenantId();

    const doc = await this.hrRepository.verifyStaffDocument(
      tenantId,
      documentId,
      dto.status,
    );

    if (doc) {
      await this.hrRepository.appendAuditLog({
        tenant_id: tenantId,
        staff_profile_id: doc.staff_profile_id,
        actor_user_id: this.getActorUserId(),
        action: `staff.document.${dto.status}`,
        metadata: { document_type: doc.document_type, document_id: doc.id },
      });
    }

    return doc;
  }

  async createDepartment(dto: CreateDepartmentDto) {
    const tenantId = this.requireTenantId();
    const dept = await this.hrRepository.createDepartment(tenantId, dto.name);
    await this.hrRepository.appendAuditLog({
      tenant_id: tenantId,
      actor_user_id: this.getActorUserId(),
      action: 'staff.department.created',
      metadata: { department_id: dept.id, name: dto.name },
    });
    return dept;
  }

  async listDepartments() {
    const tenantId = this.requireTenantId();
    return this.hrRepository.listDepartments(tenantId);
  }

  async createJobTitle(dto: CreateJobTitleDto) {
    const tenantId = this.requireTenantId();
    const title = await this.hrRepository.createJobTitle(tenantId, dto.department_id, dto.title);
    await this.hrRepository.appendAuditLog({
      tenant_id: tenantId,
      actor_user_id: this.getActorUserId(),
      action: 'staff.job_title.created',
      metadata: { job_title_id: title.id, title: dto.title, department_id: dto.department_id },
    });
    return title;
  }

  async listJobTitles(departmentId?: string) {
    const tenantId = this.requireTenantId();
    return this.hrRepository.listJobTitles(tenantId, departmentId);
  }

  async assignRole(dto: AssignRoleDto) {
    const tenantId = this.requireTenantId();
    const updated = await this.hrRepository.assignRole(
      tenantId,
      dto.staff_profile_id,
      dto.department_id,
      dto.job_title_id,
    );
    await this.hrRepository.appendAuditLog({
      tenant_id: tenantId,
      staff_profile_id: dto.staff_profile_id,
      actor_user_id: this.getActorUserId(),
      action: 'staff.role.assigned',
      metadata: { department_id: dto.department_id, job_title_id: dto.job_title_id },
    });
    return updated;
  }

  async createPayrollBand(dto: CreatePayrollBandDto) {
    const tenantId = this.requireTenantId();
    const band = await this.hrRepository.createPayrollBand(
      tenantId,
      dto.name,
      dto.base_salary,
      dto.currency || 'KES',
    );
    await this.hrRepository.appendAuditLog({
      tenant_id: tenantId,
      actor_user_id: this.getActorUserId(),
      action: 'staff.payroll_band.created',
      metadata: { band_id: band.id, name: dto.name },
    });
    return band;
  }

  async listPayrollBands() {
    const tenantId = this.requireTenantId();
    return this.hrRepository.listPayrollBands(tenantId);
  }

  async setStaffSalary(dto: SetStaffSalaryDto) {
    const tenantId = this.requireTenantId();
    const salary = await this.hrRepository.setStaffSalary(
      tenantId,
      dto.staff_profile_id,
      dto.payroll_band_id,
      dto.custom_base_salary,
    );
    await this.hrRepository.appendAuditLog({
      tenant_id: tenantId,
      staff_profile_id: dto.staff_profile_id,
      actor_user_id: this.getActorUserId(),
      action: 'staff.salary.set',
      metadata: { band_id: dto.payroll_band_id, custom: dto.custom_base_salary },
    });
    return salary;
  }

  async generatePayslip(dto: GeneratePayslipDto) {
    const tenantId = this.requireTenantId();
    
    const salary = await this.hrRepository.getStaffSalary(tenantId, dto.staff_profile_id);
    if (!salary) {
      throw new BadRequestException('Staff member does not have a salary configuration setup');
    }

    const baseAmount = Number(salary.custom_base_salary) || Number(salary.band_base_salary);
    if (!baseAmount) {
      throw new BadRequestException('Staff member has 0 base salary configured');
    }

    const deductions = dto.deductions || 0;
    const bonuses = dto.bonuses || 0;
    const netPay = baseAmount + bonuses - deductions;

    const payslip = await this.hrRepository.generatePayslip(
      tenantId,
      dto.staff_profile_id,
      dto.month,
      dto.year,
      baseAmount,
      deductions,
      bonuses,
      netPay
    );

    await this.hrRepository.appendAuditLog({
      tenant_id: tenantId,
      staff_profile_id: dto.staff_profile_id,
      actor_user_id: this.getActorUserId(),
      action: 'staff.payslip.generated',
      metadata: { month: dto.month, year: dto.year, net_pay: netPay },
    });

    return payslip;
  }

  async listPayslips(month: number, year: number) {
    const tenantId = this.requireTenantId();
    return this.hrRepository.listPayslips(tenantId, month, year);
  }

  async createPerformanceReview(dto: CreatePerformanceReviewDto) {
    const tenantId = this.requireTenantId();
    const reviewerId = this.getActorUserId(); // Assuming reviewer is the logged-in user for now. Could be mapped to their staff_profile_id if needed.
    const review = await this.hrRepository.createPerformanceReview(
      tenantId,
      dto.staff_profile_id,
      reviewerId ?? 'system',
      dto.review_date,
      dto.score,
      dto.comments,
      dto.goals_for_next_period
    );
    await this.hrRepository.appendAuditLog({
      tenant_id: tenantId,
      staff_profile_id: dto.staff_profile_id,
      actor_user_id: reviewerId,
      action: 'staff.performance_review.created',
      metadata: { review_id: review.id, score: dto.score },
    });
    return review;
  }

  async listPerformanceReviews(staffProfileId?: string) {
    const tenantId = this.requireTenantId();
    return this.hrRepository.listPerformanceReviews(tenantId, staffProfileId);
  }

  async createDisciplinaryRecord(dto: CreateDisciplinaryRecordDto) {
    const tenantId = this.requireTenantId();
    const record = await this.hrRepository.createDisciplinaryRecord(
      tenantId,
      dto.staff_profile_id,
      dto.incident_date,
      dto.severity,
      dto.description,
      dto.action_taken
    );
    await this.hrRepository.appendAuditLog({
      tenant_id: tenantId,
      staff_profile_id: dto.staff_profile_id,
      actor_user_id: this.getActorUserId(),
      action: 'staff.disciplinary_record.created',
      metadata: { record_id: record.id, severity: dto.severity },
    });
    return record;
  }

  async listDisciplinaryRecords(staffProfileId?: string) {
    const tenantId = this.requireTenantId();
    return this.hrRepository.listDisciplinaryRecords(tenantId, staffProfileId);
  }
}
