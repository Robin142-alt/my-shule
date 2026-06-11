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

  async getMyClasses(tenantId: string, userId: string) {
    const query = `
      SELECT 
        tsa.id,
        cs.name as class_name,
        s.name as subject_name,
        COALESCE(sc.student_count, 0) as learners_count,
        'Pending' as attendance_status,
        '--' as cat_average
      FROM teacher_subject_assignments tsa
      JOIN subjects s ON s.id = tsa.subject_id AND s.tenant_id = tsa.tenant_id
      JOIN class_sections cs ON cs.id = tsa.class_section_id AND cs.tenant_id = tsa.tenant_id
      LEFT JOIN (
        SELECT class_section_id, tenant_id, COUNT(student_id) as student_count
        FROM student_class_assignments
        WHERE status = 'active'
        GROUP BY class_section_id, tenant_id
      ) sc ON sc.class_section_id = tsa.class_section_id AND sc.tenant_id = tsa.tenant_id
      WHERE tsa.tenant_id = $1 
        AND tsa.teacher_user_id = $2
        AND tsa.status = 'active'
    `;
    const result = await this.databaseService.query(query, [tenantId, userId]);

    const totalLearners = result.reduce((acc, row) => acc + parseInt(row.learners_count), 0);

    return {
      stats: {
        assignedClasses: result.length,
        totalLearnersTaught: totalLearners,
        averageAttendance: "0%", // Placeholder until attendance is fully wired
      },
      classes: result.map(r => ({
        id: r.id,
        className: r.class_name,
        subjectName: r.subject_name,
        learnersCount: parseInt(r.learners_count),
        attendanceStatus: r.attendance_status,
        catAverage: r.cat_average,
      })),
    };
  }

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
    // streamId here is actually class_section_id
    const query = `
      SELECT 
        s.id,
        s.admission_number,
        s.first_name || ' ' || s.last_name as name,
        s.gender,
        s.primary_guardian_phone as parent_phone,
        sa.status
      FROM student_class_assignments sa
      JOIN students s ON s.id = sa.student_id AND s.tenant_id = sa.tenant_id
      WHERE sa.tenant_id = $1 
        AND sa.class_section_id = $2
        AND sa.status = 'active'
      ORDER BY s.first_name ASC
    `;
    const result = await this.databaseService.query(query, [tenantId, streamId]);
    return result.map(r => ({
      id: r.id,
      admissionNo: r.admission_number,
      name: r.name,
      gender: r.gender,
      parentPhone: r.parent_phone,
      status: r.status,
    }));
  }

  async getPendingAttendance(tenantId: string, userId: string) {
    const today = new Date().toISOString().split('T')[0];
    
    // We get classes taught by the teacher and see if attendance exists today
    const query = `
      SELECT 
        tsa.id as assignment_id,
        cs.name as class_name,
        cs.id as class_section_id,
        s.name as subject_name,
        COALESCE(sc.student_count, 0) as expected,
        CASE WHEN ar.id IS NULL THEN 'Pending' ELSE 'Completed' END as status
      FROM teacher_subject_assignments tsa
      JOIN subjects s ON s.id = tsa.subject_id AND s.tenant_id = tsa.tenant_id
      JOIN class_sections cs ON cs.id = tsa.class_section_id AND cs.tenant_id = tsa.tenant_id
      LEFT JOIN (
        SELECT class_section_id, tenant_id, COUNT(student_id) as student_count
        FROM student_class_assignments
        WHERE status = 'active'
        GROUP BY class_section_id, tenant_id
      ) sc ON sc.class_section_id = tsa.class_section_id AND sc.tenant_id = tsa.tenant_id
      LEFT JOIN (
        SELECT DISTINCT a.tenant_id, a.last_operation_id as id, sa.class_section_id
        FROM attendance_records a
        JOIN student_class_assignments sa ON sa.student_id = a.student_id AND sa.tenant_id = a.tenant_id
        WHERE a.attendance_date = $3
      ) ar ON ar.class_section_id = tsa.class_section_id AND ar.tenant_id = tsa.tenant_id
      WHERE tsa.tenant_id = $1 
        AND tsa.teacher_user_id = $2
        AND tsa.status = 'active'
    `;
    const result = await this.databaseService.query(query, [tenantId, userId, today]);
    
    const pendingCount = result.filter(r => r.status === 'Pending').length;

    return {
      stats: {
        totalTasks: result.length,
        pendingTasks: pendingCount,
      },
      tasks: result.map(r => ({
        id: r.assignment_id,
        classSectionId: r.class_section_id,
        date: today,
        time: "08:00",
        className: r.class_name,
        subjectName: r.subject_name,
        expected: parseInt(r.expected),
        status: r.status,
      }))
    };
  }

  async getPendingMarks(tenantId: string, userId: string) {
    const query = `
      SELECT 
        w.id as window_id,
        es.name as exam_name,
        cs.name as class_name,
        w.class_section_id,
        s.name as subject_name,
        'Main Paper' as paper_name,
        100 as out_of,
        w.closes_at as deadline,
        (
          SELECT COUNT(*) 
          FROM exam_marks em 
          WHERE em.tenant_id = w.tenant_id 
            AND em.exam_series_id = w.exam_series_id 
            AND em.class_section_id = w.class_section_id 
            AND em.subject_id = w.subject_id
        ) as entered_count,
        (
          SELECT COUNT(*) 
          FROM student_class_assignments sc 
          WHERE sc.tenant_id = w.tenant_id 
            AND sc.class_section_id = w.class_section_id 
            AND sc.status = 'active'
        ) as total_students,
        w.status as window_status
      FROM exam_mark_entry_windows w
      JOIN exam_series es ON es.id = w.exam_series_id AND es.tenant_id = w.tenant_id
      JOIN class_sections cs ON cs.id = w.class_section_id AND cs.tenant_id = w.tenant_id
      JOIN subjects s ON s.id = w.subject_id AND s.tenant_id = w.tenant_id
      JOIN teacher_subject_assignments tsa ON tsa.class_section_id = w.class_section_id 
        AND tsa.subject_id = w.subject_id 
        AND tsa.tenant_id = w.tenant_id
      WHERE w.tenant_id = $1 
        AND tsa.teacher_user_id = $2
        AND w.status = 'open'
    `;
    const result = await this.databaseService.query(query, [tenantId, userId]);
    
    return {
      stats: {
        totalWindows: result.length,
        nearingDeadline: result.filter(r => new Date(r.deadline).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000).length
      },
      windows: result.map(r => ({
        id: r.window_id,
        examName: r.exam_name,
        className: r.class_name,
        classSectionId: r.class_section_id,
        subjectName: r.subject_name,
        paperName: r.paper_name,
        outOf: parseInt(r.out_of),
        deadline: new Date(r.deadline).toLocaleDateString(),
        enteredCount: parseInt(r.entered_count),
        totalStudents: parseInt(r.total_students),
        status: parseInt(r.entered_count) >= parseInt(r.total_students) ? 'Completed' : 'Pending',
      }))
    };
  }

  async getTimetable(tenantId: string, userId: string) {
    const query = `
      SELECT 
        ts.id as slot_id,
        cs.name as class_name,
        s.name as subject_name,
        ts.room_id as room_name,
        ts.day_of_week,
        ts.starts_at,
        ts.ends_at
      FROM timetable_slots ts
      JOIN class_sections cs ON cs.id::text = ts.class_section_id AND cs.tenant_id = ts.tenant_id
      JOIN subjects s ON s.id::text = ts.subject_id AND s.tenant_id = ts.tenant_id
      WHERE ts.tenant_id = $1 
        AND ts.teacher_id = $2
        AND ts.status = 'published'
      ORDER BY ts.day_of_week ASC, ts.starts_at ASC
    `;
    const result = await this.databaseService.query(query, [tenantId, userId]);
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return result.map(r => ({
      id: r.slot_id,
      day: days[parseInt(r.day_of_week) % 7], // assuming 1=Mon or 1=Sun, adjust if needed, mostly 1=Mon but let's just map it.
      // SQL day_of_week between 1 and 7. If 1=Monday:
      dayName: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][parseInt(r.day_of_week) - 1],
      startTime: r.starts_at.substring(0, 5),
      endTime: r.ends_at.substring(0, 5),
      className: r.class_name,
      subjectName: r.subject_name,
      roomName: r.room_name || 'TBA',
    }));
  }

  async getSentMessages(tenantId: string, userId: string) {
    const query = `
      SELECT 
        id,
        recipient_phone,
        message,
        status,
        created_at
      FROM communication_sms_outbox
      WHERE tenant_id = $1
        AND sent_by = $2
      ORDER BY created_at DESC
      LIMIT 50
    `;
    const result = await this.databaseService.query(query, [tenantId, userId]);
    return result.map(r => ({
      id: r.id,
      date: new Date(r.created_at).toLocaleDateString() + ' ' + new Date(r.created_at).toLocaleTimeString(),
      recipient: r.recipient_phone,
      message: r.message,
      status: r.status,
    }));
  }

  async getClassRegisterOverview(tenantId: string, userId: string) {
    const query = `
      SELECT 
        s.id as student_id,
        s.admission_number,
        s.first_name || ' ' || s.last_name as name,
        cs.name as class_name,
        COALESCE((
          SELECT SUM(CASE WHEN direction = 'debit' THEN amount_minor ELSE -amount_minor END)
          FROM ledger_entries le
          JOIN accounts a ON le.account_id = a.id AND a.tenant_id = le.tenant_id
          WHERE a.metadata->>'student_id' = s.id::text
            AND a.tenant_id = s.tenant_id
            AND a.category = 'asset'
        ), 0) as fee_balance_minor
      FROM class_sections cs
      JOIN student_class_assignments sca ON sca.class_section_id = cs.id AND sca.tenant_id = cs.tenant_id
      JOIN students s ON s.id = sca.student_id AND s.tenant_id = sca.tenant_id
      WHERE cs.tenant_id = $1 
        AND cs.class_teacher_id = $2
        AND sca.status = 'active'
      ORDER BY s.admission_number ASC
    `;
    const result = await this.databaseService.query(query, [tenantId, userId]);
    
    // We mock some computed stats like attendance to meet UI requirements, but list real students and fee arrears
    return {
      stats: {
        totalLearners: result.length,
        absentToday: 0 // Mocked for now
      },
      students: result.map(r => ({
        id: r.student_id,
        admissionNo: r.admission_number,
        name: r.name,
        className: r.class_name,
        attendancePercent: "95%",
        feeStatus: parseInt(r.fee_balance_minor) > 0 ? \`Arrears (KES \${parseInt(r.fee_balance_minor) / 100})\` : "Cleared",
        academic: "B+",
        discipline: "Good"
      }))
    };
  }

  async getDisciplineConcerns(tenantId: string, userId: string) {
    const query = `
      SELECT 
        di.id,
        di.incident_date,
        s.first_name || ' ' || s.last_name as learner_name,
        cs.name as class_name,
        di.category,
        di.severity,
        di.status
      FROM discipline_incidents di
      JOIN students s ON s.id = di.student_id AND s.tenant_id = di.tenant_id
      JOIN student_class_assignments sca ON sca.student_id = s.id AND sca.tenant_id = s.tenant_id AND sca.status = 'active'
      JOIN class_sections cs ON cs.id = sca.class_section_id AND cs.tenant_id = sca.tenant_id
      WHERE di.tenant_id = $1
        AND di.reported_by_user_id = $2
      ORDER BY di.incident_date DESC
    `;
    const result = await this.databaseService.query(query, [tenantId, userId]);
    
    return result.map(r => ({
      id: r.id,
      date: new Date(r.incident_date).toLocaleDateString(),
      learner: r.learner_name,
      className: r.class_name,
      type: r.category,
      severity: r.severity,
      sentTo: 'Discipline Master', // Mocked or constant based on rules
      status: r.status,
    }));
  }

  async getReportComments(tenantId: string, userId: string) {
    const query = `
      SELECT 
        s.id as student_id,
        s.admission_number,
        s.first_name || ' ' || s.last_name as name,
        rcc.final_comment,
        rcc.comment_status
      FROM class_sections cs
      JOIN student_class_assignments sca ON sca.class_section_id = cs.id AND sca.tenant_id = cs.tenant_id
      JOIN students s ON s.id = sca.student_id AND s.tenant_id = sca.tenant_id
      LEFT JOIN report_card_comments rcc ON rcc.student_id = s.id AND rcc.tenant_id = s.tenant_id
      WHERE cs.tenant_id = $1 
        AND cs.class_teacher_id = $2
        AND sca.status = 'active'
      ORDER BY s.admission_number ASC
    `;
    const result = await this.databaseService.query(query, [tenantId, userId]);
    return result.map(r => ({
      studentId: r.student_id,
      admissionNo: r.admission_number,
      name: r.name,
      comment: r.final_comment || '',
      status: r.comment_status || 'pending',
    }));
  }

  async saveReportComment(tenantId: string, userId: string, data: any) {
    const checkQuery = `
      SELECT id FROM report_card_comments 
      WHERE tenant_id = $1 AND student_id = $2
    `;
    const insertQuery = `
      INSERT INTO report_card_comments (
        tenant_id, student_id, academic_term_id, class_section_id, final_comment, comment_status, created_by_user_id
      ) VALUES (
        $1, $2, 
        (SELECT id FROM academic_terms WHERE tenant_id = $1 AND status = 'active' LIMIT 1),
        (SELECT class_section_id FROM student_class_assignments WHERE tenant_id = $1 AND student_id = $2 AND status = 'active' LIMIT 1),
        $3, 'draft', $4
      )
    `;
    const updateQuery = `
      UPDATE report_card_comments 
      SET final_comment = $3, updated_at = NOW() 
      WHERE tenant_id = $1 AND student_id = $2
    `;
    
    // We would ideally loop over bulk data, but for now we handle a single save or array loop:
    const items = Array.isArray(data) ? data : [data];
    
    for (const item of items) {
      const existing = await this.databaseService.query(checkQuery, [tenantId, item.studentId]);
      if (existing.length > 0) {
        await this.databaseService.query(updateQuery, [tenantId, item.studentId, item.comment]);
      } else {
        await this.databaseService.query(insertQuery, [tenantId, item.studentId, item.comment, userId]);
      }
    }
    
    return { success: true };
  }

  async getAttendance(tenantId: string, userId: string, streamId: string) {
    return [
      { id: "2041", admissionNo: "2041", name: "Brian Otieno", attendance: "absent", reason: "sick" },
      { id: "2042", admissionNo: "2042", name: "Mary Wanjiku", attendance: "present", reason: "" }
    ];
  }

  async saveAttendance(tenantId: string, userId: string, streamId: string, records: any[]) {
    this.logger.log(`Saved ${records.length} attendance records for class/stream ${streamId}`);
    
    if (!records || records.length === 0) {
      return { success: true, count: 0 };
    }

    const today = new Date().toISOString().split('T')[0];

    // Build the bulk insert query for attendance_records
    const values = records.map((r, i) => `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4})`).join(', ');
    const params: any[] = [tenantId];
    
    records.forEach(r => {
      params.push(r.studentId, today, r.status);
    });

    const query = `
      INSERT INTO attendance_records (tenant_id, student_id, attendance_date, status)
      VALUES ${values}
      ON CONFLICT (tenant_id, student_id, attendance_date) 
      DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
    `;

    await this.databaseService.query(query, params);

    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.length - presentCount;

    await this.eventPublisherService.publishAttendanceRegisterMarked({
      tenant_id: tenantId,
      stream_id: streamId,
      marked_by_user_id: userId,
      date: today,
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
