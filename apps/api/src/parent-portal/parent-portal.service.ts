import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RequestContextService } from '../common/request-context/request-context.service';

@Injectable()
export class ParentPortalService {
  constructor(
    private readonly db: DatabaseService,
    private readonly requestContext: RequestContextService
  ) {}

  async getChildren() {
    const context = this.requestContext.requireStore();
    if (!context.user_id) throw new UnauthorizedException();
    
    const result = await this.db.query(`
      SELECT 
        s.id, s.admission_number, s.first_name, s.last_name, s.middle_name,
        s.status, s.date_of_birth, s.gender,
        sg.relationship, sg.is_primary
      FROM students s
      JOIN student_guardians sg ON s.id = sg.student_id AND s.tenant_id = sg.tenant_id
      WHERE sg.user_id = $1 AND sg.tenant_id = $2 AND sg.status = 'active'
    `, [context.user_id, context.tenant_id]);

    return { status: "success", data: result.rows };
  }

  async getDashboardData(studentId?: string) {
    const childrenResult = await this.getChildren();
    const children = childrenResult.data;

    if (children.length === 0) {
      return { status: "success", data: { activeChild: null, children: [], feeBalance: 0, attendance: null, academics: null, messages: 0, actionRequired: [], recentActivity: [] } };
    }

    const activeChild = studentId ? children.find(c => c.id === studentId) : children[0];
    if (!activeChild) {
      throw new Error("Student not found or not linked to this account");
    }

    const attendanceResult = await this.db.query(`
       SELECT status, attendance_date 
       FROM academics_attendance
       WHERE student_id = $1 AND tenant_id = $2
       ORDER BY attendance_date DESC
       LIMIT 1
    `, [activeChild.id, this.requestContext.requireStore().tenant_id]);

    const attendance = attendanceResult.rows[0] || null;

    return {
      status: "success",
      data: {
        activeChild,
        children,
        feeBalance: 0,
        attendance,
        academics: null,
        messages: 0,
        actionRequired: [],
        recentActivity: []
      }
    };
  }

  async getModuleData(module: string, studentId: string) {
    const context = this.requestContext.requireStore();
    if (!context.user_id) throw new UnauthorizedException();

    // Verify student belongs to this parent
    const verify = await this.db.query(`
      SELECT s.id, s.first_name, s.last_name
      FROM students s
      JOIN student_guardians sg ON s.id = sg.student_id AND s.tenant_id = sg.tenant_id
      WHERE sg.user_id = $1 AND sg.tenant_id = $2 AND s.id = $3 AND sg.status = 'active'
    `, [context.user_id, context.tenant_id, studentId]);

    if (verify.rows.length === 0) {
      throw new UnauthorizedException("Student not found or not linked to this account");
    }

    const studentName = verify.rows[0].first_name;

    // Dynamic routing based on module
    let data: any[] = [];
    let columns: string[] = [];

    switch (module) {
      case 'fees':
        data = [];
        columns = ["Item", "Billed", "Paid", "Balance", "Due", "Status"];
        break;
      case 'exams':
        data = [];
        columns = ["Exam", "Subject", "Score", "Grade", "Rank", "Teacher Comment"];
        break;
      case 'discipline':
        data = [];
        columns = ["Date", "Category", "Issue", "Action Taken", "Status"];
        break;
      case 'attendance':
        data = [];
        columns = ["Date", "Status", "Remarks"];
        break;
      default:
        data = [{ notice: `No detailed records found for ${module} yet.` }];
        columns = ["Notice"];
        break;
    }

    return { 
      status: "success", 
      studentId, 
      studentName,
      module, 
      data,
      columns
    };
  }
}
