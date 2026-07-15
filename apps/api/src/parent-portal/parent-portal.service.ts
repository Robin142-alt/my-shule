import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RequestContextService } from '../common/request-context/request-context.service';

@Injectable()
export class ParentPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService
  ) {}

  private requireContext() {
    const context = this.requestContext.requireStore();
    if (!context.user_id) throw new UnauthorizedException();
    if (!context.tenant_id) throw new UnauthorizedException('No school context');
    return { userId: context.user_id, tenantId: context.tenant_id };
  }

  private async getLinkedChildIds(userId: string, tenantId: string): Promise<string[]> {
    const guardians = await this.prisma.studentGuardian.findMany({
      where: {
        guardianId: userId,
        schoolId: tenantId,
      },
      select: {
        studentId: true,
      },
    });
    return guardians.map(g => g.studentId);
  }

  async getChildren() {
    const { userId, tenantId } = this.requireContext();

    // Query StudentGuardian records linked to this user's guardian profile
    const result = await this.prisma.studentGuardian.findMany({
      where: {
        guardianId: userId,
        schoolId: tenantId,
      },
      include: {
        student: {
          include: {
            currentClass: true,
            currentStream: true,
          }
        }
      }
    });

    const students = result.map((sg: any) => ({
      id: sg.student.id,
      admission_number: sg.student.admissionNumber,
      first_name: sg.student.firstName,
      last_name: sg.student.lastName,
      middle_name: sg.student.middleName,
      status: sg.student.studentStatus || (sg.student as any).status,
      date_of_birth: sg.student.dateOfBirth,
      gender: sg.student.gender,
      relationship: sg.relationshipType,
      is_primary: sg.isPrimaryContact,
      class_name: sg.student.currentClass?.name || null,
      stream_name: sg.student.currentStream?.name || null,
    }));

    return { status: "success", data: students };
  }

  async getOverview() {
    const { userId, tenantId } = this.requireContext();
    const childIds = await this.getLinkedChildIds(userId, tenantId);

    if (childIds.length === 0) {
      return {
        status: "success",
        data: {
          children: [],
          feeBalance: 0,
          recentPayments: [],
          recentAttendance: [],
          recentDiscipline: []
        }
      };
    }

    // Get children details
    const childrenResult = await this.getChildren();
    const children = childrenResult.data;

    // Total fee balance across all children
    const feeAccounts = await this.prisma.studentFeeAccount.findMany({
      where: {
        studentId: { in: childIds },
        schoolId: tenantId,
      },
      select: {
        currentBalance: true,
      }
    });
    const feeBalance = feeAccounts.reduce((sum, fa) => sum + (fa.currentBalance || 0), 0);

    // Recent payments
    const payments = await this.prisma.payment.findMany({
      where: {
        studentId: { in: childIds },
        schoolId: tenantId,
      },
      include: {
        student: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { paymentDate: 'desc' },
      take: 5,
    });

    const recentPayments = payments.map(p => ({
      id: p.id,
      studentId: p.studentId,
      studentName: `${p.student.firstName} ${p.student.lastName}`,
      amount: p.amount,
      date: p.paymentDate,
      reference: p.paymentReference,
      status: p.status,
    }));

    // Recent attendance
    const attendanceRecords = await this.prisma.attendanceRecord.findMany({
      where: {
        studentId: { in: childIds },
        schoolId: tenantId,
      },
      include: {
        student: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentAttendance = attendanceRecords.map(a => ({
      id: a.id,
      studentId: a.studentId,
      studentName: `${a.student.firstName} ${a.student.lastName}`,
      status: a.status,
      date: a.createdAt,
      remarks: a.remarks,
    }));

    // Recent discipline
    const disciplineCases = await this.prisma.disciplineCase.findMany({
      where: {
        studentId: { in: childIds },
        schoolId: tenantId,
      },
      include: {
        student: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { incidentDate: 'desc' },
      take: 5,
    });

    const recentDiscipline = disciplineCases.map(d => ({
      id: d.id,
      studentId: d.studentId,
      studentName: `${d.student.firstName} ${d.student.lastName}`,
      incidentType: d.incidentType,
      severity: d.severity,
      date: d.incidentDate,
      status: d.status,
    }));

    return {
      status: "success",
      data: {
        children,
        feeBalance,
        recentPayments,
        recentAttendance,
        recentDiscipline,
      }
    };
  }

  async getAcademics() {
    const { userId, tenantId } = this.requireContext();
    const childIds = await this.getLinkedChildIds(userId, tenantId);

    if (childIds.length === 0) {
      return {
        status: "success",
        data: {
          reportCards: [],
          marks: [],
          subjects: []
        }
      };
    }

    // Get report cards
    const reportCardsRaw = await this.prisma.reportCard.findMany({
      where: {
        studentId: { in: childIds },
        schoolId: tenantId,
        status: 'RELEASED',
        releasedAt: { not: null },
      },
      include: {
        student: {
          select: { firstName: true, lastName: true }
        },
        academicYear: true,
        term: true,
        class: true,
      },
      orderBy: [
        { academicYear: { startDate: 'desc' } },
        { term: { termNumber: 'desc' } }
      ],
    });

    const reportCards = reportCardsRaw.map(rc => ({
      id: rc.id,
      studentId: rc.studentId,
      studentName: `${rc.student.firstName} ${rc.student.lastName}`,
      academicYear: rc.academicYear.name,
      term: rc.term.name,
      className: rc.class.name,
      totalMarks: rc.totalMarks,
      meanScore: rc.meanScore,
      meanGrade: rc.meanGrade,
      status: rc.status,
      releasedAt: rc.releasedAt,
    }));

    // Get marks entry
    const marksRaw = await this.prisma.marksEntry.findMany({
      where: {
        studentId: { in: childIds },
        schoolId: tenantId,
        status: { in: ['APPROVED', 'LOCKED'] },
        examCycle: {
          reportCards: {
            some: {
              studentId: { in: childIds },
              schoolId: tenantId,
              status: 'RELEASED',
              releasedAt: { not: null },
            },
          },
        },
      },
      include: {
        student: {
          select: { firstName: true, lastName: true }
        },
        subject: true,
        examCycle: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const marks = marksRaw.map(m => ({
      id: m.id,
      studentId: m.studentId,
      studentName: `${m.student.firstName} ${m.student.lastName}`,
      subjectName: m.subject.name,
      subjectCode: m.subject.code,
      examCycleName: m.examCycle.name,
      marksObtained: m.marksObtained,
      grade: m.grade,
      comment: m.comment,
    }));

    // Get children to extract class IDs
    const students = await this.prisma.student.findMany({
      where: {
        id: { in: childIds },
        schoolId: tenantId,
      },
      select: {
        currentClassId: true,
      }
    });
    const classIds = students.map(s => s.currentClassId).filter(Boolean) as string[];

    // Get subjects for these classes
    const classSubjectsRaw = classIds.length > 0 ? await this.prisma.classSubject.findMany({
      where: {
        classId: { in: classIds },
        schoolId: tenantId,
      },
      include: {
        subject: true,
      }
    }) : [];

    const subjects = classSubjectsRaw.map(cs => ({
      classId: cs.classId,
      subjectId: cs.subjectId,
      name: cs.subject.name,
      code: cs.subject.code,
      isCompulsory: cs.isCompulsory,
    }));

    return {
      status: "success",
      data: {
        reportCards,
        marks,
        subjects
      }
    };
  }

  async getFinance() {
    const { userId, tenantId } = this.requireContext();
    const childIds = await this.getLinkedChildIds(userId, tenantId);

    if (childIds.length === 0) {
      return {
        status: "success",
        data: {
          feeAccounts: [],
          invoices: [],
          payments: []
        }
      };
    }

    const feeAccountsRaw = await this.prisma.studentFeeAccount.findMany({
      where: {
        studentId: { in: childIds },
        schoolId: tenantId,
      },
      include: {
        student: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    const feeAccounts = feeAccountsRaw.map(fa => ({
      studentId: fa.studentId,
      studentName: `${fa.student.firstName} ${fa.student.lastName}`,
      openingBalance: fa.openingBalance,
      currentBalance: fa.currentBalance,
      status: fa.status,
    }));

    const invoicesRaw = await this.prisma.invoice.findMany({
      where: {
        studentId: { in: childIds },
        schoolId: tenantId,
      },
      include: {
        student: {
          select: { firstName: true, lastName: true }
        },
        academicYear: true,
        term: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const invoices = invoicesRaw.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      studentId: inv.studentId,
      studentName: `${inv.student.firstName} ${inv.student.lastName}`,
      academicYear: inv.academicYear.name,
      term: inv.term.name,
      amountDue: inv.amountDue,
      amountPaid: inv.amountPaid,
      balance: inv.balance,
      status: inv.status,
      dueDate: inv.dueDate,
      createdAt: inv.createdAt,
    }));

    const paymentsRaw = await this.prisma.payment.findMany({
      where: {
        studentId: { in: childIds },
        schoolId: tenantId,
      },
      include: {
        student: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { paymentDate: 'desc' },
    });

    const payments = paymentsRaw.map(p => ({
      id: p.id,
      paymentReference: p.paymentReference,
      studentId: p.studentId,
      studentName: `${p.student.firstName} ${p.student.lastName}`,
      paymentMethod: p.paymentMethod,
      amount: p.amount,
      paymentDate: p.paymentDate,
      status: p.status,
      remarks: p.remarks,
    }));

    return {
      status: "success",
      data: {
        feeAccounts,
        invoices,
        payments
      }
    };
  }

  async getCommunication() {
    const { userId, tenantId } = this.requireContext();
    const childIds = await this.getLinkedChildIds(userId, tenantId);

    // Announcements / school broadcasts
    const broadcastsRaw = await this.prisma.communicationBroadcast.findMany({
      where: {
        schoolId: tenantId,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const broadcasts = broadcastsRaw.map(b => ({
      id: b.id,
      audience: b.audience,
      message: b.message,
      channels: b.channels,
      status: b.status,
      createdAt: b.createdAt,
    }));

    // Notifications for this specific parent user or global parent role
    const notificationsRaw = await this.prisma.notification.findMany({
      where: {
        schoolId: tenantId,
        OR: [
          { targetUserId: userId },
          { targetRole: 'PARENT' }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const notifications = notificationsRaw.map(n => ({
      id: n.id,
      title: n.title,
      message: n.message,
      priority: n.priority,
      status: n.status,
      createdAt: n.createdAt,
    }));

    // Student-specific communication logs
    const studentCommunicationsRaw = childIds.length > 0 ? await this.prisma.studentCommunication.findMany({
      where: {
        schoolId: tenantId,
        OR: [
          { guardianId: userId },
          { studentId: { in: childIds } }
        ]
      },
      orderBy: { sentAt: 'desc' },
      take: 20,
    }) : [];

    const studentCommunications = studentCommunicationsRaw.map(sc => ({
      id: sc.id,
      studentId: sc.studentId,
      messageType: sc.messageType,
      deliveryChannel: sc.deliveryChannel,
      deliveryStatus: sc.deliveryStatus,
      content: sc.content,
      sentAt: sc.sentAt,
    }));

    return {
      status: "success",
      data: {
        broadcasts,
        notifications,
        studentCommunications
      }
    };
  }

  async getDashboardData(studentId?: string) {
    const { userId, tenantId } = this.requireContext();
    const childrenResult = await this.getChildren();
    const children = childrenResult.data;

    if (children.length === 0) {
      return {
        status: "success",
        data: {
          activeChild: null,
          children: [],
          feeBalance: 0,
          attendance: null,
          academics: null,
          messages: 0,
          actionRequired: [],
          recentActivity: []
        }
      };
    }

    const activeChild = studentId ? children.find(c => c.id === studentId) : children[0];
    if (!activeChild) {
      throw new UnauthorizedException("Student not found or not linked to this account");
    }

    // Active child fee balance
    const feeAccount = await this.prisma.studentFeeAccount.findFirst({
      where: {
        studentId: activeChild.id,
        schoolId: tenantId,
      }
    });
    const feeBalance = feeAccount?.currentBalance ?? 0;

    // Active child latest attendance
    const attendanceRecords = await this.prisma.attendanceRecord.findMany({
      where: {
        studentId: activeChild.id,
        schoolId: tenantId
      },
      orderBy: { createdAt: 'desc' },
      take: 1
    });

    const attendance = attendanceRecords.length > 0 ? {
      status: attendanceRecords[0].status,
      attendance_date: attendanceRecords[0].createdAt
    } : null;

    // Active child academics summary (latest report card info)
    const reportCard = await this.prisma.reportCard.findFirst({
      where: {
        studentId: activeChild.id,
        schoolId: tenantId,
        status: 'RELEASED',
        releasedAt: { not: null },
      },
      include: {
        academicYear: true,
        term: true,
      },
      orderBy: [
        { academicYear: { startDate: 'desc' } },
        { term: { termNumber: 'desc' } }
      ]
    });

    const academics = reportCard ? {
      meanScore: reportCard.meanScore,
      meanGrade: reportCard.meanGrade,
      term: reportCard.term.name,
      academicYear: reportCard.academicYear.name,
    } : null;

    // Count of unread notifications for parent
    const unreadCount = await this.prisma.notification.count({
      where: {
        schoolId: tenantId,
        targetUserId: userId,
        status: 'UNREAD',
      }
    });

    // Action required (e.g. overdue invoices for active child)
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        studentId: activeChild.id,
        schoolId: tenantId,
        status: 'OVERDUE',
      },
      orderBy: { dueDate: 'asc' }
    });

    const actionRequired = overdueInvoices.map(inv => ({
      type: 'PAYMENT_DUE',
      message: `Invoice ${inv.invoiceNumber} for KES ${inv.balance} is overdue since ${inv.dueDate.toDateString()}`,
      entityId: inv.id,
    }));

    // Active child recent activity (payments, attendance changes, discipline)
    const payments = await this.prisma.payment.findMany({
      where: { studentId: activeChild.id, schoolId: tenantId },
      orderBy: { paymentDate: 'desc' },
      take: 3,
    });

    const recentAttendanceList = await this.prisma.attendanceRecord.findMany({
      where: { studentId: activeChild.id, schoolId: tenantId },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    const disciplineCases = await this.prisma.disciplineCase.findMany({
      where: { studentId: activeChild.id, schoolId: tenantId },
      orderBy: { incidentDate: 'desc' },
      take: 3,
    });

    const recentActivity = [
      ...payments.map(p => ({
        type: 'PAYMENT',
        description: `Fee payment of KES ${p.amount} received (${p.paymentMethod})`,
        date: p.paymentDate,
      })),
      ...recentAttendanceList.map(a => ({
        type: 'ATTENDANCE',
        description: `Attendance marked as ${a.status}`,
        date: a.createdAt,
      })),
      ...disciplineCases.map(d => ({
        type: 'DISCIPLINE',
        description: `Discipline incident logged: ${d.incidentType} (${d.severity})`,
        date: d.incidentDate,
      }))
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);

    return {
      status: "success",
      data: {
        activeChild,
        children,
        feeBalance,
        attendance,
        academics,
        messages: unreadCount,
        actionRequired,
        recentActivity
      }
    };
  }
}
