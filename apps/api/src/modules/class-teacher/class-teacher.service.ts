import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { EventPublisherService } from '../events/event-publisher.service';

@Injectable()
export class ClassTeacherService {
  private readonly logger = new Logger(ClassTeacherService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly eventPublisherService: EventPublisherService,
  ) {}

  async getOverview(tenantId: string, userId: string, streamId: string) {
    // In a real app, we would query the database for the class stats
    return {
      totalLearners: 46,
      presentToday: 43,
      absentToday: 3,
      feeArrears: 7,
      urgentFollowups: [
        { id: "1", learnerName: "Brian Otieno", issue: "Absent 3 days straight", actionNeeded: "Contact Parent" }
      ]
    };
  }

  async getRegister(tenantId: string, userId: string, streamId: string) {
    return [
      { id: "2041", admissionNo: "2041", name: "Brian Otieno", gender: "Male", parentPhone: "+254712345678", status: "Active" },
      { id: "2042", admissionNo: "2042", name: "Mary Wanjiku", gender: "Female", parentPhone: "+254722345678", status: "Active" }
    ];
  }

  async getAttendance(tenantId: string, userId: string, streamId: string) {
    return [
      { id: "2041", admissionNo: "2041", name: "Brian Otieno", attendance: "absent", reason: "sick" },
      { id: "2042", admissionNo: "2042", name: "Mary Wanjiku", attendance: "present", reason: "" }
    ];
  }

  async saveAttendance(tenantId: string, userId: string, streamId: string, records: any[]) {
    this.logger.log(`Saved ${records.length} attendance records for stream ${streamId}`);
    
    // Calculate simple stats for the event
    const presentCount = records.filter(r => r.attendance === 'present').length;
    const absentCount = records.length - presentCount;

    await this.eventPublisherService.publishAttendanceRegisterMarked({
      tenant_id: tenantId,
      stream_id: streamId,
      marked_by_user_id: userId,
      date: new Date().toISOString().split('T')[0],
      present_count: presentCount,
      absent_count: absentCount,
    });

    return { success: true, count: records.length };
  }

  async reportDisciplineIncident(tenantId: string, userId: string, streamId: string, payload: any) {
    this.logger.log(`Reported discipline incident for student ${payload.studentId}`);
    
    await this.eventPublisherService.publishDisciplineIncidentReported({
      tenant_id: tenantId,
      incident_id: `inc_${Date.now()}`, // Mock ID
      student_id: payload.studentId,
      reported_by_user_id: userId,
      date: new Date().toISOString().split('T')[0],
      description: payload.description,
      severity: payload.severity || 'low',
    });

    return { success: true };
  }

  async referWelfareCase(tenantId: string, userId: string, streamId: string, payload: any) {
    this.logger.log(`Referred welfare case for student ${payload.studentId}`);
    
    await this.eventPublisherService.publishWelfareCaseReferred({
      tenant_id: tenantId,
      referral_id: `ref_${Date.now()}`, // Mock ID
      student_id: payload.studentId,
      referred_by_user_id: userId,
      date: new Date().toISOString().split('T')[0],
      reason: payload.reason,
    });

    return { success: true };
  }

  async getProgress(tenantId: string, userId: string, streamId: string) {
    return {
      classMean: "56.4%",
      classGrade: "C+",
      missingMarksSubjects: 2,
      topPerformer: "Mary Wanjiku",
      learnersBelowTarget: 14
    };
  }

  async getComments(tenantId: string, userId: string, streamId: string) {
    return [
      { id: "2041", name: "Brian Otieno", mean: "45%", grade: "D+", position: "34/46", comment: "Needs to put in more effort." },
      { id: "2042", name: "Mary Wanjiku", mean: "88%", grade: "A", position: "1/46", comment: "Excellent performance, keep it up." }
    ];
  }

  async getDiscipline(tenantId: string, userId: string, streamId: string) {
    return [
      { id: "d1", date: "2026-06-10", learner: "Brian Otieno", issue: "Noise making", severity: "Minor", status: "Open" },
      { id: "d2", date: "2026-06-08", learner: "John Doe", issue: "Bullying", severity: "Serious", status: "Referred to Deputy" }
    ];
  }

  async getWelfare(tenantId: string, userId: string, streamId: string) {
    return [
      { id: "w1", date: "2026-06-05", learner: "Brian Otieno", concern: "Frequent absence", priority: "High", status: "Pending meeting" }
    ];
  }

  async getTimetable(tenantId: string, userId: string, streamId: string) {
    return [
      { id: "t1", day: "Monday", time: "08:00 - 08:40", subject: "Mathematics", teacher: "Mr. Otieno", room: "Room 12" },
      { id: "t2", day: "Monday", time: "08:40 - 09:20", subject: "English", teacher: "Mrs. Smith", room: "Room 12" }
    ];
  }

  async getSubjects(tenantId: string, userId: string, streamId: string) {
    return [
      { id: "s1", subject: "Mathematics", teacher: "Mr. Otieno", lessonsPerWeek: 6 },
      { id: "s2", subject: "English", teacher: "Mrs. Smith", lessonsPerWeek: 5 },
      { id: "s3", subject: "Kiswahili", teacher: "Mr. Kamau", lessonsPerWeek: 5 }
    ];
  }

  async getCommunication(tenantId: string, userId: string, streamId: string) {
    return [
      { id: "c1", date: "2026-06-01", recipient: "All Parents", type: "SMS", message: "Reminder: Mid-term exams start next week.", status: "Delivered" },
      { id: "c2", date: "2026-06-05", recipient: "Brian Otieno's Parent", type: "Email", message: "Discipline incident report attached.", status: "Delivered" }
    ];
  }

  async getTasks(tenantId: string, userId: string, streamId: string) {
    return [
      { id: "task1", task: "Complete Report Card Comments", dueDate: "2026-06-15", status: "Pending" },
      { id: "task2", task: "Follow up on fee arrears", dueDate: "2026-06-12", status: "In Progress" }
    ];
  }

  async getFees(tenantId: string, userId: string, streamId: string) {
    return [
      { id: "f1", learner: "Brian Otieno", balance: "KES 15,000", status: "Overdue", lastPayment: "2026-01-15" }
    ];
  }

  async getHealth(tenantId: string, userId: string, streamId: string) {
    return [
      { id: "h1", learner: "Mary Wanjiku", condition: "Asthma", allergies: "Dust", notes: "Inhaler in bag" }
    ];
  }

  async getHomework(tenantId: string, userId: string, streamId: string) {
    return [
      { id: "hw1", subject: "Mathematics", title: "Algebra Assignment", dueDate: "2026-06-20", completionRate: "85%" }
    ];
  }

  async getMeetings(tenantId: string, userId: string, streamId: string) {
    return [
      { id: "m1", date: "2026-06-18", time: "14:00", parent: "Mr. Otieno", agenda: "Academic Performance", status: "Scheduled" }
    ];
  }

  async getRequests(tenantId: string, userId: string, streamId: string) {
    return [
      { id: "r1", date: "2026-06-10", learner: "Brian Otieno", type: "Leave", status: "Pending", requestedBy: "Parent" }
    ];
  }

  async getDocuments(tenantId: string, userId: string, streamId: string) {
    return [
      { id: "doc1", title: "Term 1 Syllabus", type: "PDF", uploadedAt: "2026-01-10", size: "2.4 MB" }
    ];
  }

  async getNotifications(tenantId: string, userId: string, streamId: string) {
    return [
      { id: "notif1", date: "2026-06-11", message: "Staff meeting tomorrow at 4 PM.", isRead: false }
    ];
  }

  async getReports(tenantId: string, userId: string, streamId: string) {
    return [
      { id: "rep1", term: "Term 1", year: "2026", generatedAt: "2026-04-15", status: "Published" }
    ];
  }

  async getSettings(tenantId: string, userId: string, streamId: string) {
    return {
      notificationsEnabled: true,
      defaultView: "Overview",
      theme: "Light"
    };
  }
}
