import { Injectable } from '@nestjs/common';
import { WidgetRegistryService } from '../../common/widget-registry/widget-registry.service';
import { DashboardLayoutDto, ActionButtonDto } from './dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly registry: WidgetRegistryService) {}

  async getDashboardLayout(tenantId: string, role: string, userCapabilities: string[]): Promise<DashboardLayoutDto> {
    // Resolve widgets from registered modules based on tenant and capabilities
    const widgets = await this.registry.resolveWidgets({
      tenantId,
      role,
      capabilities: userCapabilities,
    });

    // Resolve static dashboard buttons based on Button and Action Execution Contract
    // "Buttons are never removed. They degrade to LOCKED if capability is missing."
    const availableButtons = [
      { id: 'btn_create_student', label: 'Admit Student', action: 'students.admit', requiredCapability: 'students:write' },
      { id: 'btn_record_payment', label: 'Record Payment', action: 'finance.record_payment', requiredCapability: 'finance:write' },
      { id: 'btn_publish_exam', label: 'Publish Exam', action: 'exams.publish', requiredCapability: 'exams:write' },
    ];

    const resolvedButtons: ActionButtonDto[] = availableButtons.map(btn => ({
      id: btn.id,
      label: btn.label,
      action: btn.action,
      state: userCapabilities.includes('*:*') || userCapabilities.includes(btn.requiredCapability) ? 'ACTIVE' : 'LOCKED'
    }));

    return {
      tenantId,
      role,
      widgets,
      buttons: resolvedButtons
    };
  }

  async getParentOverview(tenantId: string, parentId: string) {
    return {
      activities: [],
      alerts: []
    };
  }

  async getParentAcademics(tenantId: string, parentId: string) {
    return {
      grades: [],
      assignments: []
    };
  }

  async getParentFinance(tenantId: string, parentId: string) {
    return {
      invoices: [],
      payments: []
    };
  }

  async getParentCommunication(tenantId: string, parentId: string) {
    return {
      messages: [],
      notices: []
    };
  }

  async getStudentOverview(tenantId: string, studentId: string) {
    return {
      schedule: [],
      announcements: []
    };
  }

  async getStudentAcademics(tenantId: string, studentId: string) {
    return {
      assignments: [],
      exams: [],
      reportCards: []
    };
  }

  async getStudentAttendance(tenantId: string, studentId: string) {
    return {
      records: []
    };
  }
}
