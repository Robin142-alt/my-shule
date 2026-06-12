import { Injectable } from '@nestjs/common';
import { Prisma, StudentStatus, BoardingStatus } from '@prisma/client';
import { decodeCreatedAtIdCursor } from '../../../common/pagination/cursor-pagination';
import { PrismaService } from '../../../database/prisma.service';
import { PiiEncryptionService } from '../../security/pii-encryption.service';
import { StudentEntity } from '../entities/student.entity';

interface CreateStudentInput {
  tenant_id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  status: StudentEntity['status'];
  date_of_birth: string | null;
  gender: StudentEntity['gender'];
  primary_guardian_name: string | null;
  primary_guardian_phone: string | null;
  metadata: Record<string, unknown>;
  created_by_user_id: string | null;
}

type UpdateStudentInput = Partial<Omit<CreateStudentInput, 'tenant_id' | 'created_by_user_id'>> & {
  metadata?: Record<string, unknown>;
};

@Injectable()
export class StudentsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly piiEncryptionService: PiiEncryptionService,
  ) {}

  async createStudent(input: CreateStudentInput): Promise<StudentEntity> {
    return this.prisma.executeWithTenant(input.tenant_id, input.created_by_user_id, async (tx) => {
      const student = await tx.student.create({
        data: {
          schoolId: input.tenant_id,
          admissionNumber: input.admission_number,
          firstName: input.first_name,
          lastName: input.last_name,
          middleName: input.middle_name,
          studentStatus: (input.status?.toUpperCase() ?? 'ACTIVE') as StudentStatus,
          dateOfBirth: input.date_of_birth ? new Date(input.date_of_birth) : new Date(),
          gender: input.gender ?? 'undisclosed',
          primaryGuardianName: this.piiEncryptionService.encryptNullable(
            input.primary_guardian_name,
            this.guardianNameAad(input.tenant_id),
          ),
          primaryGuardianPhone: this.piiEncryptionService.encryptNullable(
            input.primary_guardian_phone,
            this.guardianPhoneAad(input.tenant_id),
          ),
          metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
          createdByUserId: input.created_by_user_id,
          nationality: 'Kenyan', // Defaulting as schema requires it
          boardingStatus: BoardingStatus.DAY_SCHOLAR, // Defaulting as schema requires it
          admissionDate: new Date(), // Defaulting as schema requires it
        },
      });

      return this.mapRow(student);
    });
  }

  async findById(tenantId: string, studentId: string): Promise<StudentEntity | null> {
    return this.prisma.executeWithTenant(tenantId, null, async (tx) => {
      const student = await tx.student.findUnique({
        where: {
          id: studentId,
          schoolId: tenantId, // Enforce Tenant Isolation manually alongside RLS
        },
      });

      return student ? this.mapRow(student) : null;
    });
  }

  async listStudents(
    tenantId: string,
    options: {
      search?: string;
      status?: StudentEntity['status'];
      limit: number;
      cursor?: string;
    },
  ): Promise<StudentEntity[]> {
    return this.prisma.executeWithTenant(tenantId, null, async (tx) => {
      const where: Prisma.StudentWhereInput = {
        schoolId: tenantId,
      };

      if (options.status) {
        where.studentStatus = options.status.toUpperCase() as StudentStatus;
      }

      if (options.search) {
        where.OR = [
          { admissionNumber: { contains: options.search, mode: 'insensitive' } },
          { firstName: { contains: options.search, mode: 'insensitive' } },
          { lastName: { contains: options.search, mode: 'insensitive' } },
          { middleName: { contains: options.search, mode: 'insensitive' } },
        ];
      }

      let cursorQuery: Prisma.StudentWhereUniqueInput | undefined;
      if (options.cursor) {
        const cursor = decodeCreatedAtIdCursor(options.cursor);
        cursorQuery = { id: cursor.id };
      }

      const students = await tx.student.findMany({
        where,
        take: options.limit,
        skip: options.cursor ? 1 : undefined,
        cursor: cursorQuery,
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
      });

      return students.map((s) => this.mapRow(s));
    });
  }

  async countStudentsByStatus(
    tenantId: string,
    status: StudentEntity['status'],
  ): Promise<number> {
    return this.prisma.executeWithTenant(tenantId, null, async (tx) => {
      return tx.student.count({
        where: {
          schoolId: tenantId,
          studentStatus: status.toUpperCase() as StudentStatus,
        },
      });
    });
  }

  async updateStudent(
    tenantId: string,
    studentId: string,
    input: UpdateStudentInput,
  ): Promise<StudentEntity | null> {
    return this.prisma.executeWithTenant(tenantId, null, async (tx) => {
      const data: Prisma.StudentUpdateInput = {};

      if (input.admission_number !== undefined) data.admissionNumber = input.admission_number;
      if (input.first_name !== undefined) data.firstName = input.first_name;
      if (input.last_name !== undefined) data.lastName = input.last_name;
      if (input.middle_name !== undefined) data.middleName = input.middle_name;
      if (input.status !== undefined) data.studentStatus = input.status.toUpperCase() as StudentStatus;
      if (input.date_of_birth !== undefined) data.dateOfBirth = input.date_of_birth ? new Date(input.date_of_birth) : undefined;
      if (input.gender !== undefined) data.gender = input.gender ?? 'undisclosed';

      if (input.primary_guardian_name !== undefined) {
        data.primaryGuardianName = this.piiEncryptionService.encryptNullable(
          input.primary_guardian_name,
          this.guardianNameAad(tenantId),
        );
      }

      if (input.primary_guardian_phone !== undefined) {
        data.primaryGuardianPhone = this.piiEncryptionService.encryptNullable(
          input.primary_guardian_phone,
          this.guardianPhoneAad(tenantId),
        );
      }

      if (input.metadata !== undefined) {
        data.metadata = (input.metadata ?? Prisma.DbNull) as Prisma.InputJsonValue;
      }

      if (Object.keys(data).length === 0) {
        return this.findById(tenantId, studentId);
      }

      const student = await tx.student.update({
        where: {
          id: studentId,
        },
        data,
      });

      return this.mapRow(student);
    });
  }

  private mapRow(row: any): StudentEntity {
    return Object.assign(new StudentEntity(), {
      id: row.id,
      tenant_id: row.schoolId,
      admission_number: row.admissionNumber,
      first_name: row.firstName,
      last_name: row.lastName,
      middle_name: row.middleName,
      status: (row.studentStatus || '').toLowerCase(),
      date_of_birth: row.dateOfBirth ? row.dateOfBirth.toISOString().split('T')[0] : null,
      gender: row.gender,
      primary_guardian_name: this.piiEncryptionService.decryptNullable(
        row.primaryGuardianName,
        this.guardianNameAad(row.schoolId),
      ),
      primary_guardian_phone: this.piiEncryptionService.decryptNullable(
        row.primaryGuardianPhone,
        this.guardianPhoneAad(row.schoolId),
      ),
      metadata: (row.metadata && typeof row.metadata === 'object') ? row.metadata : {},
      created_by_user_id: row.createdByUserId,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    });
  }

  private guardianNameAad(tenantId: string): string {
    return `students:${tenantId}:primary_guardian_name`;
  }

  private guardianPhoneAad(tenantId: string): string {
    return `students:${tenantId}:primary_guardian_phone`;
  }
}
