import { AgpExecutionService } from '../../common/platform-governance/agp-execution.service';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { AUTH_ANONYMOUS_USER_ID } from '../../auth/auth.constants';
import { InvalidCursorError, normalizeCursorLimit } from '../../common/pagination/cursor-pagination';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { BillingAccessService } from '../billing/billing-access.service';
import { SubscriptionsRepository } from '../billing/repositories/subscriptions.repository';
import { UsageMeterService } from '../billing/usage-meter.service';
import { StudentEventsService } from '../events/student-events.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { ListStudentsQueryDto } from './dto/list-students-query.dto';
import { StudentResponseDto } from './dto/student-response.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentEntity } from './entities/student.entity';
import { StudentsRepository } from './repositories/students.repository';

@Injectable()
export class StudentsService {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);
    
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

  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
    private readonly studentsRepository: StudentsRepository,
    private readonly billingAccessService: BillingAccessService,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly studentEventsService: StudentEventsService,
    private readonly agp: AgpExecutionService,
    private readonly usageMeterService: UsageMeterService,
  ) {}

  async createStudent(dto: CreateStudentDto): Promise<StudentResponseDto> {
    return this.agp.execute({
      actionName: 'CREATE_STUDENT',
      requiredCapability: 'students:write',
      aggregateType: 'STUDENT',
      aggregateId: dto.admission_number, // We don't have the UUID until it's created, but admission_number is a good proxy.
      handler: async () => {
        return this.prisma.withRequestTransaction(async () => {
          const requestContext = this.requestContext.requireStore();
          const tenantId = this.requireTenantId();
          await this.assertActiveStudentLimit(tenantId, dto.status ?? 'active');

          try {
            const student = await this.studentsRepository.createStudent({
              tenant_id: tenantId,
              admission_number: dto.admission_number.trim(),
              first_name: dto.first_name.trim(),
              last_name: dto.last_name.trim(),
              middle_name: dto.middle_name?.trim() || null,
              status: dto.status ?? 'active',
              date_of_birth: dto.date_of_birth ?? null,
              gender: dto.gender ?? null,
              primary_guardian_name: dto.primary_guardian_name?.trim() || null,
              primary_guardian_phone: dto.primary_guardian_phone?.trim() || null,
              metadata: dto.metadata ?? {},
              created_by_user_id:
                requestContext.user_id && requestContext.user_id !== '00000000-0000-0000-0000-000000000000'
                  ? requestContext.user_id
                  : null,
            });

            await this.studentEventsService.publishStudentCreated({
              tenant_id: tenantId,
              student_id: student.id,
              created_at: student.created_at.toISOString(),
              created_by_user_id: student.created_by_user_id,
              admission_number: student.admission_number,
              first_name: student.first_name,
              last_name: student.last_name,
              metadata: student.metadata,
            });
            await this.usageMeterService.recordUsage({
              feature_key: 'students.created',
              quantity: '1',
              idempotency_key: `student:create:${student.id}`,
              metadata: {
                student_id: student.id,
                admission_number: student.admission_number,
              },
            });

            return this.mapStudent(student);
          } catch (error: any) {
            this.rethrowUniqueConstraint(error, 'student admission number already exists in this tenant');
            throw error;
          }
        });
      }
    });
  }

  async listStudents(query: ListStudentsQueryDto): Promise<StudentResponseDto[]> {
    let students: StudentEntity[];

    try {
      students = await this.studentsRepository.listStudents(this.requireTenantId(), {
        search: query.search?.trim() || undefined,
        status: query.status,
        limit: normalizeCursorLimit(query.limit, 50, 200),
        cursor: query.cursor,
      });
    } catch (error) {
      if (error instanceof InvalidCursorError) {
        throw new BadRequestException('Invalid student pagination cursor');
      }

      throw error;
    }

    return students.map((student) => this.mapStudent(student));
  }

  async getStudent(studentId: string): Promise<StudentResponseDto> {
    const student = await this.studentsRepository.findById(this.requireTenantId(), studentId);

    if (!student) {
      throw new NotFoundException(`Student "${studentId}" was not found`);
    }

    return this.mapStudent(student);
  }

  async updateStudent(studentId: string, dto: UpdateStudentDto): Promise<StudentResponseDto> {
    return this.prisma.withRequestTransaction(async () => {
      const tenantId = this.requireTenantId();
      const existingStudent = await this.studentsRepository.findById(tenantId, studentId);

      if (!existingStudent) {
        throw new NotFoundException(`Student "${studentId}" was not found`);
      }

      await this.assertActiveStudentLimit(
        tenantId,
        dto.status ?? existingStudent.status,
        existingStudent.status,
      );

      const updatePayload = {
        first_name: dto.first_name?.trim(),
        last_name: dto.last_name?.trim(),
        middle_name: dto.middle_name?.trim(),
        status: dto.status,
        date_of_birth: dto.date_of_birth,
        gender: dto.gender,
        primary_guardian_name: dto.primary_guardian_name?.trim(),
        metadata: dto.metadata,
      };

      try {
        const student = await this.studentsRepository.updateStudent(
          tenantId,
          studentId,
          updatePayload,
        );

        if (!student) {
          throw new NotFoundException(`Student "${studentId}" was not found`);
        }

        return this.mapStudent(student);
      } catch (error) {
        this.rethrowUniqueConstraint(
          error,
          'student admission number already exists in this tenant',
        );
        throw error;
      }
    });
  }

  private mapStudent(student: StudentEntity): StudentResponseDto {
    return Object.assign(new StudentResponseDto(), {
      id: student.id,
      tenant_id: student.tenant_id,
      admission_number: student.admission_number,
      first_name: student.first_name,
      last_name: student.last_name,
      middle_name: student.middle_name,
      status: student.status,
      date_of_birth: student.date_of_birth,
      gender: student.gender,
      primary_guardian_name: student.primary_guardian_name,
      primary_guardian_phone: student.primary_guardian_phone,
      metadata: student.metadata,
      created_by_user_id: student.created_by_user_id,
      created_at: student.created_at.toISOString(),
      updated_at: student.updated_at.toISOString(),
    });
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.requireStore().tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for student operations');
    }

    return tenantId;
  }

  private rethrowUniqueConstraint(error: unknown, message: string): void {
    const databaseError = error as { code?: string; constraint?: string };

    if (
      databaseError?.code === '23505' &&
      databaseError.constraint?.includes('admission_number')
    ) {
      throw new ConflictException(message);
    }
  }

  private async assertActiveStudentLimit(
    tenantId: string,
    nextStatus: StudentEntity['status'],
    currentStatus?: StudentEntity['status'],
  ): Promise<void> {
    const activatingStudent = nextStatus === 'active' && currentStatus !== 'active';

    if (!activatingStudent) {
      return;
    }

    const access =
      this.requestContext.getStore()?.billing
      ?? (await this.billingAccessService.resolveForTenant(tenantId));

    if (!access?.is_active) {
      return;
    }

    const subscription = await this.subscriptionsRepository.lockCurrentByTenant(tenantId);

    if (!subscription) {
      return;
    }

    const configuredLimit = this.readPositiveLimit(subscription.limits['students.max_active']);

    if (configuredLimit == null) {
      return;
    }

    const activeStudentCount = await this.studentsRepository.countStudentsByStatus(
      tenantId,
      'active',
    );

    if (BigInt(activeStudentCount) >= configuredLimit) {
      throw new HttpException(
        'Current subscription limit "students.max_active" has been reached',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  private readPositiveLimit(value: number | string | boolean | null | undefined): bigint | null {
    if (value == null || typeof value === 'boolean') {
      return null;
    }

    const normalizedValue = typeof value === 'number' ? value.toString() : value.trim();

    if (!/^\d+$/.test(normalizedValue)) {
      return null;
    }

    const parsedValue = BigInt(normalizedValue);
    return parsedValue > 0n ? parsedValue : null;
  }

  async getSummary(tenantId: string) {
    const [
      totalRes,
      activeRes,
      newAdmissionsRes,
      boysRes,
      girlsRes,
    ] = await Promise.all([
      this.executeSql('SELECT COUNT(*) as count FROM students WHERE tenant_id = $1', [tenantId]),
      this.executeSql('SELECT COUNT(*) as count FROM students WHERE tenant_id = $1 AND status = \'active\'', [tenantId]),
      this.executeSql('SELECT COUNT(*) as count FROM students WHERE tenant_id = $1 AND created_at >= date_trunc(\'month\', CURRENT_DATE)', [tenantId]),
      this.executeSql('SELECT COUNT(*) as count FROM students WHERE tenant_id = $1 AND gender ILIKE \'male\'', [tenantId]),
      this.executeSql('SELECT COUNT(*) as count FROM students WHERE tenant_id = $1 AND gender ILIKE \'female\'', [tenantId]),
    ]);

    const totalStudents = Number(totalRes.rows[0]?.count || 0);
    const newEnrollments = Number(newAdmissionsRes.rows[0]?.count || 0);
    const boysCount = Number(boysRes.rows[0]?.count || 0);
    const girlsCount = Number(girlsRes.rows[0]?.count || 0);
    
    // We compute percentage if there are students, else default to 50/50 visual stub
    const totalGender = boysCount + girlsCount;
    const boysPct = totalGender > 0 ? Math.round((boysCount / totalGender) * 100) : 50;
    const girlsPct = totalGender > 0 ? Math.round((girlsCount / totalGender) * 100) : 50;

    return {
      totalStudents: totalStudents.toString(),
      absentToday: '0', // Stubbable until attendance module is linked
      newEnrollments: newEnrollments.toString(),
      trendLabel: newEnrollments > 0 ? `+${newEnrollments} this month` : 'Stable',
      demographics: [
        { label: 'Boys', value: boysPct },
        { label: 'Girls', value: girlsPct },
      ]
    };
  }

  async createGuardian(tenantId: string, studentId: string, displayName: string, relationship: string, email: string, phone: string) {
    return this.studentsRepository.createGuardian(tenantId, studentId, displayName, relationship, email, phone);
  }

  async listGuardians(tenantId: string) {
    return this.studentsRepository.listGuardians(tenantId);
  }
}
