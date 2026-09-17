import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import './admission-input.test';
import { validate } from 'class-validator';
import { BadRequestException } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { AdmissionsSchemaService } from './admissions-schema.service';
import { AdmissionsService } from './admissions.service';
import { AdmissionsRepository } from './repositories/admissions.repository';

test('CreateApplicationDto rejects blank required admissions fields', async () => {
  const dto = Object.assign(new CreateApplicationDto(), {
    full_name: '   ',
    date_of_birth: '2017-01-02',
    gender: 'Female',
    birth_certificate_number: 'BC-REAL-001',
    nationality: '   ',
    class_applying: 'Grade 4',
    parent_name: 'Guardian One',
    parent_phone: '+254700000001',
    relationship: 'Guardian',
  });

  const errors = await validate(dto);
  const properties = errors.map((error) => error.property);

  assert.ok(properties.includes('full_name'));
  assert.ok(properties.includes('nationality'));
});

test('CreateApplicationDto accepts an application without a date of birth', async () => {
  const dto = Object.assign(new CreateApplicationDto(), {
    full_name: 'Amina Njeri',
    gender: 'Female',
    birth_certificate_number: 'BC-REAL-002',
    nationality: 'Kenyan',
    class_applying: 'Grade 4',
    parent_name: 'Guardian Two',
    parent_phone: '+254700000002',
    relationship: 'Guardian',
  });

  const errors = await validate(dto);

  assert.equal(errors.some((error) => error.property === 'date_of_birth'), false);
});

test('AdmissionsSchemaService adds a full-text index for application search', async () => {
  let schemaSql = '';
  const service = new AdmissionsSchemaService(
    {
      runSchemaBootstrap: async (sql: string) => {
        schemaSql += sql;
      },
    } as never,
    {
      onModuleInit: async () => undefined,
    } as never,
  );

  await service.onModuleInit();

  assert.match(schemaSql, /CREATE INDEX IF NOT EXISTS ix_admission_applications_search_vector/);
  assert.match(schemaSql, /ON admission_applications\s+USING GIN/);
  assert.match(schemaSql, /application_number/);
  assert.match(schemaSql, /parent_phone/);
  assert.match(schemaSql, /class_applying/);
  assert.match(schemaSql, /ALTER TABLE admission_applications ALTER COLUMN date_of_birth DROP NOT NULL/);
  assert.doesNotMatch(schemaSql, /attendance/i);
});

test('AdmissionsService registers an approved application into the student directory', async () => {
  const requestContext = new RequestContextService();
  let applicationRegistered = false;
  const deliveryCallOrder: string[] = [];
  let failedOperation: any = null;

  const service = new AdmissionsService(
    requestContext,
    {
      withRequestTransaction: async <T>(callback: () => Promise<T>): Promise<T> => callback(),
    } as never,
    {
      findApplicationByIdForUpdate: async () => ({
        id: '00000000-0000-0000-0000-000000000701',
        tenant_id: 'tenant-a',
        full_name: 'Brenda Atieno',
        date_of_birth: '2014-02-19',
        gender: 'female',
        birth_certificate_number: 'BC-448211',
        nationality: 'Kenyan',
        class_applying: 'Grade 7',
        status: 'approved',
        parent_name: 'Janet Atieno',
        parent_phone: '254712300401',
      }),
      markApplicationRegistered: async () => {
        applicationRegistered = true;
        deliveryCallOrder.push('application-registered');
        return {
          id: '00000000-0000-0000-0000-000000000701',
          status: 'registered',
        };
      },
      attachApplicationDocumentsToStudent: async () => [],
      createAllocation: async () => ({
        id: '00000000-0000-0000-0000-000000000703',
        class_name: 'Grade 7',
        stream_name: 'Hope',
      }),
      findAcademicClassSectionForUpdate: async () => ({
        id: '00000000-0000-0000-0000-000000000704',
        stream_id: '00000000-0000-0000-0000-000000000705',
        class_name: 'Grade 7',
        stream_name: 'Hope',
        academic_year: '2026',
        capacity: 45,
        current_enrollments: 12,
      }),
      createStudentAcademicEnrollment: async () => ({
        id: '00000000-0000-0000-0000-000000000706',
        student_id: '00000000-0000-0000-0000-000000000702',
        application_id: '00000000-0000-0000-0000-000000000701',
        class_section_id: '00000000-0000-0000-0000-000000000704',
        stream_id: '00000000-0000-0000-0000-000000000705',
        class_name: 'Grade 7',
        stream_name: 'Hope',
        academic_year: '2026',
        status: 'active',
      }),
      enrollStudentSubjectsAndTimetable: async () => ({
        subject_enrollments: [],
        timetable_enrollments: [],
      }),
      findActiveFeeStructureForClass: async () => null,
    } as never,
    {
      save: async () => {
        throw new Error('not used in this test');
      },
    } as never,
    {
      createStudent: async (input: any) => ({
        id: '00000000-0000-0000-0000-000000000702',
        tenant_id: 'tenant-a',
        admission_number: 'ADM-G7-118',
        first_name: 'Brenda',
        last_name: 'Atieno',
        middle_name: null,
        status: 'active',
        date_of_birth: '2014-02-19',
        gender: 'female',
        primary_guardian_name: 'Janet Atieno',
        primary_guardian_phone: input.primary_guardian_phone,
        metadata: {},
        created_by_user_id: '00000000-0000-0000-0000-000000000001',
        created_at: new Date('2026-05-04T10:00:00.000Z'),
        updated_at: new Date('2026-05-04T10:00:00.000Z'),
      }),
    } as never,
    undefined,
    undefined,
    undefined,
    {
      recordSchoolOperation: async (operation: any) => {
        deliveryCallOrder.push('operation-event');
        failedOperation = operation;
        throw new Error('event outbox unavailable');
      },
    } as never,
    undefined,
    undefined,
    {
      sendSms: async () => {
        deliveryCallOrder.push('sms-queue');
        throw new Error('SMS outbox unavailable');
      },
    } as never,
  );

  const response = await requestContext.run(
    {
      request_id: 'req-admissions-register-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'admissions',
      session_id: 'session-1',
      permissions: ['admissions:*', 'students:*', 'documents:*'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/admissions/applications/00000000-0000-0000-0000-000000000701/register',
      started_at: '2026-05-04T00:00:00.000Z',
    },
    () =>
      service.registerApprovedApplication('00000000-0000-0000-0000-000000000701', {
        admission_number: 'ADM-G7-118',
        class_name: 'Grade 7',
        stream_name: 'Hope',
        dormitory_name: 'Mara House',
        transport_route: 'Eastern Bypass',
      }),
  );

  assert.equal(response.student.admission_number, 'ADM-G7-118');
  assert.equal(response.student.primary_guardian_phone, '+254712300401');
  assert.equal(response.application_status, 'registered');
  assert.equal(applicationRegistered, true);
  assert.deepEqual(deliveryCallOrder, [
    'application-registered',
    'sms-queue',
    'operation-event',
  ]);
  assert.equal(response.notification_delivery.guardian_sms.status, 'degraded');
  assert.equal(response.notification_delivery.guardian_sms.reason, 'sms_queue_failed');
  assert.equal(response.operation_event.status, 'degraded');
  assert.equal(response.operation_event.reason, 'operation_event_recording_failed');
  assert.equal(failedOperation.event.payload.guardian_sms_status, 'degraded');
  assert.equal('sms' in failedOperation, false);
});

test('AdmissionsService rejects foreign or inactive class selections before creating a student', async () => {
  const requestContext = new RequestContextService();
  let studentCreates = 0;
  let registrationWrites = 0;
  const service = new AdmissionsService(
    requestContext,
    {
      withRequestTransaction: async <T>(callback: () => Promise<T>): Promise<T> => callback(),
    } as never,
    {
      findApplicationByIdForUpdate: async () => ({
        id: '00000000-0000-0000-0000-000000000705',
        tenant_id: 'tenant-a',
        full_name: 'Tenant Boundary Student',
        gender: 'female',
        nationality: 'Kenyan',
        class_applying: 'Grade 7',
        status: 'approved',
        parent_name: 'Boundary Parent',
        parent_phone: '254700000705',
      }),
      // The canonical repository returns null for an inactive section or one
      // owned by another tenant.
      findAcademicClassSectionForUpdate: async () => null,
      markApplicationRegistered: async () => {
        registrationWrites += 1;
      },
    } as never,
    {} as never,
    {
      createStudent: async () => {
        studentCreates += 1;
      },
    } as never,
  );

  await assert.rejects(
    requestContext.run(
      {
        request_id: 'req-admissions-class-boundary',
        tenant_id: 'tenant-a',
        user_id: '00000000-0000-0000-0000-000000000001',
        role: 'admissions',
        session_id: 'session-1',
        permissions: ['admissions:*', 'students:*'],
        is_authenticated: true,
        client_ip: '127.0.0.1',
        user_agent: 'test-suite',
        method: 'POST',
        path: '/admissions/applications/00000000-0000-0000-0000-000000000705/register',
        started_at: '2026-08-15T00:00:00.000Z',
      },
      () => service.registerApprovedApplication(
        '00000000-0000-0000-0000-000000000705',
        {
          admission_number: 'ADM-BOUNDARY-705',
          class_name: 'Foreign Grade',
          stream_name: 'Hidden',
        },
      ),
    ),
    (error: unknown) => error instanceof BadRequestException
      && /not found in this school/i.test(error.message),
  );

  assert.equal(studentCreates, 0);
  assert.equal(registrationWrites, 0);
});

test('AdmissionsService completes approved application enrolment with guardian, fee, academic, and event handoffs', async () => {
  const requestContext = new RequestContextService();
  const calls: Record<string, any[]> = {
    studentCreates: [],
    allocations: [],
    academicEnrollments: [],
    subjectTimetableEnrollments: [],
    guardianLinks: [],
    feeAssignments: [],
    parentInvites: [],
    events: [],
    schoolOperations: [],
    smsQueue: [],
    agpIntents: [],
  };

  const service = new AdmissionsService(
    requestContext,
    {
      withRequestTransaction: async <T>(callback: () => Promise<T>): Promise<T> => callback(),
    } as never,
    {
      findApplicationByIdForUpdate: async (tenantId: string, applicationId: string) => {
        assert.equal(tenantId, 'tenant-a');
        assert.equal(applicationId, '00000000-0000-0000-0000-000000000731');
        return {
          id: applicationId,
          tenant_id: tenantId,
          full_name: 'Amina Wairimu Njeri',
          date_of_birth: '2014-02-19',
          gender: 'female',
          birth_certificate_number: 'BC-448211',
          nationality: 'Kenyan',
          class_applying: 'Grade 7',
          status: 'approved',
          parent_name: 'Janet Njeri',
          parent_phone: '254712300401',
          parent_email: 'janet.njeri@example.test',
          parent_occupation: 'Nurse',
          relationship: 'Mother',
          previous_school: 'Lake Primary',
          kcpe_results: null,
          cbc_level: 'Grade 6',
          nemis_upi: 'UPI-731',
          allergies: null,
          conditions: null,
          emergency_contact: '254722300401',
        };
      },
      findAcademicClassSectionForUpdate: async (tenantId: string, className: string, streamName: string) => {
        assert.equal(tenantId, 'tenant-a');
        assert.equal(className, 'Grade 7');
        assert.equal(streamName, 'Hope');
        return {
          id: '00000000-0000-0000-0000-000000000732',
          stream_id: '00000000-0000-0000-0000-000000000733',
          class_name: className,
          stream_name: streamName,
          academic_year: '2026',
          capacity: 45,
          current_enrollments: 12,
        };
      },
      markApplicationRegistered: async (tenantId: string, applicationId: string, studentId: string) => {
        assert.equal(tenantId, 'tenant-a');
        assert.equal(applicationId, '00000000-0000-0000-0000-000000000731');
        assert.equal(studentId, '00000000-0000-0000-0000-000000000733');
        return { id: applicationId, status: 'registered', admitted_student_id: studentId };
      },
      attachApplicationDocumentsToStudent: async (tenantId: string, applicationId: string, studentId: string) => {
        assert.equal(tenantId, 'tenant-a');
        return [{ id: 'document-1', application_id: applicationId, student_id: studentId }];
      },
      createAllocation: async (input: any) => {
        calls.allocations.push(input);
        return {
          id: '00000000-0000-0000-0000-000000000734',
          class_name: input.class_name,
          stream_name: input.stream_name,
          dormitory_name: input.dormitory_name,
          transport_route: input.transport_route,
        };
      },
      createStudentAcademicEnrollment: async (input: any) => {
        calls.academicEnrollments.push(input);
        return {
          id: '00000000-0000-0000-0000-000000000735',
          application_id: input.application_id,
          class_section_id: input.class_section_id,
          class_name: input.class_name,
          stream_name: input.stream_name,
          academic_year: input.academic_year,
          status: 'active',
        };
      },
      enrollStudentSubjectsAndTimetable: async (input: any) => {
        calls.subjectTimetableEnrollments.push(input);
        return {
          subject_enrollments: [{ id: 'subject-enrollment-1', student_id: input.student_id }],
          timetable_enrollments: [{ id: 'timetable-enrollment-1', student_id: input.student_id }],
        };
      },
      findActiveFeeStructureForClass: async (tenantId: string, className: string) => {
        assert.equal(tenantId, 'tenant-a');
        assert.equal(className, 'Grade 7');
        return {
          id: '00000000-0000-0000-0000-000000000736',
          description: 'Grade 7 admission fee',
          currency_code: 'KES',
          amount_minor: 150000,
          due_days_after_registration: 7,
        };
      },
      createStudentFeeAssignmentInvoice: async (input: any) => {
        calls.feeAssignments.push(input);
        return {
          assignment: { id: 'fee-assignment-1', student_id: input.student_id },
          invoice: {
            id: 'invoice-1',
            student_id: input.student_id,
            invoice_number: input.invoice_number,
            amount_due_minor: input.amount_minor,
          },
        };
      },
      upsertStudentGuardianLink: async (input: any) => {
        calls.guardianLinks.push(input);
        return {
          id: 'guardian-link-1',
          student_id: input.student_id,
          invitation_id: input.invitation_id,
          email: input.email,
          status: 'invited',
        };
      },
    } as never,
    {
      save: async () => {
        throw new Error('not used in this test');
      },
    } as never,
    {
      createStudent: async (input: any) => {
        calls.studentCreates.push(input);
        return {
          id: '00000000-0000-0000-0000-000000000733',
          tenant_id: 'tenant-a',
          admission_number: input.admission_number,
          first_name: input.first_name,
          last_name: input.last_name,
          middle_name: input.middle_name ?? null,
          status: input.status,
          date_of_birth: input.date_of_birth,
          gender: input.gender,
          primary_guardian_name: input.primary_guardian_name,
          primary_guardian_phone: input.primary_guardian_phone,
          metadata: input.metadata,
          created_by_user_id: '00000000-0000-0000-0000-000000000001',
          created_at: new Date('2026-05-04T10:00:00.000Z'),
          updated_at: new Date('2026-05-04T10:00:00.000Z'),
        };
      },
    } as never,
    {
      inviteTenantUser: async (input: any) => {
        calls.parentInvites.push(input);
        return { id: 'parent-invite-1', email: input.email, role_code: input.role_code };
      },
    } as never,
    {
      publish: async (event: any) => {
        calls.events.push(event);
        return { id: 'event-1', ...event };
      },
    } as never,
    {
      execute: async (intent: { handler: () => Promise<unknown> }) => {
        calls.agpIntents.push(intent);
        return intent.handler();
      },
    } as never,
    {
      recordSchoolOperation: async (operation: any) => {
        calls.schoolOperations.push(operation);
        return {
          id: 'school-operation-1',
          event_key: 'school.operation.recorded:tenant-a:admission-registration-00000000-0000-0000-0000-000000000731',
        };
      },
    } as never,
    undefined,
    undefined,
    {
      sendSms: async (input: any) => {
        calls.smsQueue.push(input);
        return { success: true, messageId: 'sms-outbox-731', status: 'Pending' };
      },
    } as never,
  );

  const response = await requestContext.run(
    {
      request_id: 'req-admissions-complete-chain-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'admissions',
      session_id: 'session-1',
      permissions: ['admissions:*', 'students:*', 'documents:*', 'users:write', 'tenant_memberships:write'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/admissions/applications/00000000-0000-0000-0000-000000000731/register',
      started_at: '2026-05-04T00:00:00.000Z',
    },
    () =>
      service.registerApprovedApplication('00000000-0000-0000-0000-000000000731', {
        admission_number: 'ADM-G7-731',
        class_name: 'Grade 7',
        stream_name: 'Hope',
        dormitory_name: 'Mara House',
        transport_route: 'Eastern Bypass',
      }),
  );

  assert.equal(response.student.status, 'active');
  assert.equal(response.application_status, 'registered');
  assert.equal(response.academic_enrollment?.class_section_id, '00000000-0000-0000-0000-000000000732');
  assert.equal(response.subject_enrollments.length, 1);
  assert.equal(response.timetable_enrollments.length, 1);
  assert.equal(response.parent_invitation?.id, 'parent-invite-1');
  assert.equal(response.guardian_link?.student_id, '00000000-0000-0000-0000-000000000733');
  assert.equal(response.fee_invoice?.amount_due_minor, 150000);
  assert.equal(calls.studentCreates[0].metadata.admissions.guardian.parent_email, 'janet.njeri@example.test');
  assert.equal(calls.allocations[0].school_id, 'tenant-a');
  assert.equal(calls.academicEnrollments[0].school_id, 'tenant-a');
  assert.equal(calls.subjectTimetableEnrollments[0].school_id, 'tenant-a');
  assert.equal(calls.guardianLinks[0].school_id, 'tenant-a');
  assert.equal(calls.guardianLinks[0].email, 'janet.njeri@example.test');
  assert.equal(calls.guardianLinks[0].phone, '+254712300401');
  assert.equal(calls.studentCreates[0].primary_guardian_phone, '+254712300401');
  assert.equal(calls.feeAssignments[0].school_id, 'tenant-a');
  assert.match(calls.feeAssignments[0].invoice_number, /^SF-\d{8}-[0-9A-F]{8}$/);
  assert.deepEqual(calls.parentInvites[0], {
    email: 'janet.njeri@example.test',
    display_name: 'Janet Njeri',
    role_code: 'parent',
  });
  assert.equal(calls.events[0].event_name, 'student.academic_enrollment.created');
  assert.equal(calls.events[0].payload.tenant_id, 'tenant-a');
  assert.equal(calls.schoolOperations[0].schoolId, 'tenant-a');
  assert.equal(calls.schoolOperations[0].event.type, 'admission.application.registered');
  assert.equal(
    calls.schoolOperations[0].event.id,
    'admission-registration-00000000-0000-0000-0000-000000000731',
  );
  assert.equal(calls.schoolOperations[0].notifications.length, 2);
  assert.equal('sms' in calls.schoolOperations[0], false);
  assert.deepEqual(calls.smsQueue, [{
    tenantId: 'tenant-a',
    userId: '00000000-0000-0000-0000-000000000001',
    idempotencyKey: 'admission-guardian:00000000-0000-0000-0000-000000000731:00000000-0000-0000-0000-000000000733',
    recipientPhone: '+254712300401',
    message: 'Dear parent, Amina Wairimu Njeri has been admitted to Grade 7. Admission Number: ADM-G7-731.',
  }]);
  assert.equal(response.notification_delivery.guardian_sms.status, 'queued');
  assert.equal(response.notification_delivery.guardian_sms.queue_id, 'sms-outbox-731');
  assert.equal(response.notification_delivery.guardian_sms.recipient_phone_last4, '0401');
  assert.equal(response.operation_event.status, 'recorded');
  assert.equal(response.idempotent_replay, false);
  assert.equal(calls.schoolOperations[0].event.payload.guardian_sms_status, 'queued');
  assert.equal(calls.schoolOperations[0].event.payload.guardian_sms_queue_id, 'sms-outbox-731');
  assert.equal(calls.schoolOperations[0].event.payload.guardian_sms_recipient_last4, '0401');
  assert.equal(calls.agpIntents[0].actionName, 'APPROVED_APPLICATION_REGISTERED');
  assert.equal(calls.agpIntents[0].requiredCapability, 'admissions:write');
  assert.equal(calls.agpIntents[0].aggregateId, '00000000-0000-0000-0000-000000000731');
});

test('AdmissionsService exports applications as a server-side CSV artifact with checksum', async () => {
  const requestContext = new RequestContextService();
  let tenantUsed: string | null = null;
  let listOptions: { search?: string; status?: string; limit: number; offset?: number } | null = null;

  const service = new AdmissionsService(
    requestContext,
    {} as never,
    {
      listApplications: async (
        tenantId: string,
        options: { search?: string; status?: string; limit: number; offset?: number },
      ) => {
        tenantUsed = tenantId;
        listOptions = options;
        return [
          {
            application_number: 'APP-20260514-001',
            full_name: 'Achieng, Otieno',
            class_applying: 'Grade 4',
            parent_phone: '+254700000001',
            status: 'approved',
          },
        ];
      },
    } as never,
    {} as never,
    {} as never,
  );

  const artifact = await requestContext.run(
    {
      request_id: 'req-admissions-report-export',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'admissions',
      session_id: 'session-1',
      permissions: ['admissions:*'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'GET',
      path: '/admissions/reports/applications/export',
      started_at: '2026-05-14T00:00:00.000Z',
    },
    () => service.exportReportCsv('applications'),
  );

  assert.equal(tenantUsed, 'tenant-a');
  assert.deepEqual(listOptions, { limit: 500, offset: 0 });
  assert.equal(artifact.report_id, 'applications');
  assert.equal(artifact.filename, 'admissions-applications.csv');
  assert.equal(artifact.content_type, 'text/csv; charset=utf-8');
  assert.equal(artifact.row_count, 1);
  assert.equal(
    artifact.csv,
    'Applicant,Application No,Class,Parent Phone,Status\r\n"Achieng, Otieno",APP-20260514-001,Grade 4,+254700000001,Approved\r\n',
  );
  assert.equal(
    artifact.checksum_sha256,
    createHash('sha256').update(artifact.csv).digest('hex'),
  );
});

test('AdmissionsService bounds admissions list pagination and suppresses one-letter searches', async () => {
  const requestContext = new RequestContextService();
  const observed: Record<string, unknown> = {};
  const service = new AdmissionsService(
    requestContext,
    {} as never,
    {
      listApplications: async (_tenantId: string, options: Record<string, unknown>) => {
        observed.applications = options;
        return [];
      },
      listStudentDirectory: async (_tenantId: string, options: Record<string, unknown>) => {
        observed.students = options;
        return [];
      },
      listParents: async (_tenantId: string, options: Record<string, unknown>) => {
        observed.parents = options;
        return [];
      },
      listDocuments: async (_tenantId: string, options: Record<string, unknown>) => {
        observed.documents = options;
        return [];
      },
      listAllocations: async (_tenantId: string, options: Record<string, unknown>) => {
        observed.allocations = options;
        return [];
      },
      listTransfers: async (_tenantId: string, options: Record<string, unknown>) => {
        observed.transfers = options;
        return [];
      },
    } as never,
    {} as never,
    {} as never,
  );
  const context = {
    request_id: 'req-admissions-list-bounds',
    tenant_id: 'tenant-a',
    user_id: '00000000-0000-0000-0000-000000000001',
    role: 'admissions',
    session_id: 'session-1',
    permissions: ['admissions:*', 'documents:*', 'transfers:*'],
    is_authenticated: true,
    client_ip: '127.0.0.1',
    user_agent: 'test-suite',
    method: 'GET',
    path: '/admissions/applications',
    started_at: '2026-05-14T00:00:00.000Z',
  };

  await requestContext.run(context, () =>
    service.listApplications({ search: 'a', limit: 500, offset: -10 } as never),
  );
  await requestContext.run(context, () =>
    service.listStudents({ search: 'b', limit: 500, offset: Number.NaN } as never),
  );
  await requestContext.run(context, () => service.listParents({ limit: 500 } as never));
  await requestContext.run(context, () => service.listDocuments({ offset: -5 } as never));
  await requestContext.run(context, () => service.listAllocations({ limit: 500 } as never));
  await requestContext.run(context, () => service.listTransfers({ limit: 500 } as never));

  assert.deepEqual(observed.applications, { search: undefined, status: undefined, limit: 50, offset: 0 });
  assert.deepEqual(observed.students, { search: undefined, limit: 50, offset: 0 });
  assert.deepEqual(observed.parents, { search: undefined, limit: 50, offset: 0 });
  assert.deepEqual(observed.documents, { search: undefined, status: undefined, limit: 25, offset: 0 });
  assert.deepEqual(observed.allocations, { search: undefined, limit: 50, offset: 0 });
  assert.deepEqual(observed.transfers, { search: undefined, status: undefined, limit: 50, offset: 0 });
});

test('AdmissionsRepository applies bounded LIMIT/OFFSET to large admissions lists', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new AdmissionsRepository({
    executeWithTenant: async (tenantId: string, userId: string | null, cb: any) => {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          calls.push({ sql, params });
          return [];
        },
      });
    },
  } as never);

  await repository.listApplications('tenant-a', { search: 'a', limit: 500, offset: -10 } as never);
  await repository.listDocuments('tenant-a', { limit: 500, offset: -10 } as never);
  await repository.listAllocations('tenant-a', { limit: 500, offset: -10 } as never);
  await repository.listStudentDirectory('tenant-a', { search: 'a', limit: 500, offset: -10 } as never);
  await repository.listParents('tenant-a', { limit: 500, offset: -10 } as never);
  await repository.listTransfers('tenant-a', { limit: 500, offset: -10 } as never);

  for (const call of calls) {
    assert.match(call.sql, /tenant_id|tenant\\.id|school_id/);
    assert.match(call.sql, /LIMIT \$\d+::integer\s+OFFSET \$\d+::integer/);
  }

  assert.equal(calls[0]!.params.at(-2), 50);
  assert.equal(calls[0]!.params.at(-1), 0);
  assert.equal(calls[1]!.params.at(-2), 50);
  assert.equal(calls[2]!.params.at(-2), 50);
  assert.equal(calls[3]!.params.at(-2), 50);
  assert.equal(calls[4]!.params.at(-2), 50);
  assert.equal(calls[5]!.params.at(-2), 50);
});

test('AdmissionsRepository lists active admissions class options from tenant-owned class sections', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new AdmissionsRepository({
    executeWithTenant: async (tenantId: string, _userId: string | null, cb: any) => {
      assert.equal(tenantId, 'tenant-a');
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          calls.push({ sql, params });
          return [
            {
              id: 'class-1',
              name: 'Grade 7',
              grade_level: 'Grade 7',
              stream: 'North',
              capacity: 45,
              student_count: 12,
              available_seats: 33,
              label: 'Grade 7 North',
              value: 'Grade 7',
            },
          ];
        },
      });
    },
  } as never);

  const classes = await repository.listClassOptions('tenant-a');

  assert.match(calls[0]!.sql, /FROM class_sections section/);
  assert.match(calls[0]!.sql, /WHERE section\.tenant_id = \$1/);
  assert.match(calls[0]!.sql, /section\.is_active = TRUE/);
  assert.match(calls[0]!.sql, /section\.enrolment_open = TRUE/);
  assert.match(calls[0]!.sql, /JOIN academic_years year/);
  assert.match(calls[0]!.sql, /student_class_assignments/);
  assert.match(calls[0]!.sql, /student_academic_enrollments/);
  assert.deepEqual(calls[0]!.params, ['tenant-a']);
  assert.doesNotMatch(calls[0]!.sql, /PP2|Kisumu Boys/i);
  assert.deepEqual(classes, [
    {
      id: 'class-1',
      name: 'Grade 7',
      grade_level: 'Grade 7',
      stream: 'North',
      capacity: 45,
      student_count: 12,
      available_seats: 33,
      label: 'Grade 7 North',
      value: 'Grade 7',
    },
  ]);
});

test('AdmissionsService exposes class options for the current school tenant', async () => {
  const requestContext = new RequestContextService();
  let tenantUsed: string | null = null;
  const service = new AdmissionsService(
    requestContext,
    {} as never,
    {
      listClassOptions: async (tenantId: string) => {
        tenantUsed = tenantId;
        return [
          {
            id: 'class-1',
            name: 'Grade 7',
            grade_level: 'Grade 7',
            stream: 'North',
            capacity: 45,
            student_count: 12,
            available_seats: 33,
            label: 'Grade 7 North',
            value: 'Grade 7',
          },
        ];
      },
    } as never,
    {} as never,
    {} as never,
  );

  const classes = await requestContext.run(
    {
      request_id: 'req-admissions-class-options',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'admissions',
      session_id: 'session-1',
      permissions: ['admissions:*'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'GET',
      path: '/admissions/classes',
      started_at: '2026-07-13T00:00:00.000Z',
    },
    () => service.listClassOptions(),
  );

  assert.equal(tenantUsed, 'tenant-a');
  assert.equal(classes[0].label, 'Grade 7 North');
  assert.equal(classes[0].value, 'Grade 7');
});

test('AdmissionsRepository creates applications using the live tenant-scoped schema', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new AdmissionsRepository({
    executeWithTenant: async (_tenantId: string, _userId: string | null, cb: any) => {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          calls.push({ sql, params });
          return [{
            id: '00000000-0000-0000-0000-000000000931',
            school_id: params[0],
            application_number: params[1],
            full_name: params[2],
            date_of_birth: params[3],
            gender: params[4],
            birth_certificate_number: params[5],
            nationality: params[6],
            class_applying: params[11],
            parent_name: params[12],
            parent_phone: params[13],
            relationship: params[16],
            status: params[20],
          }];
        },
      });
    },
  } as never);

  const application = await repository.createApplication({
    school_id: 'tenant-a',
    application_number: 'APP-20260623-001',
    full_name: 'Achieng Otieno',
    date_of_birth: '2016-09-12',
    gender: 'female',
    birth_certificate_number: 'BC-2026-001',
    nationality: 'Kenyan',
    previous_school: null,
    kcpe_results: null,
    cbc_level: null,
    nemis_upi: null,
    class_applying: 'Grade 4',
    parent_name: 'Janet Otieno',
    parent_phone: '+254700000001',
    parent_email: null,
    parent_occupation: null,
    relationship: 'Mother',
    allergies: null,
    conditions: null,
    emergency_contact: null,
    status: 'pending',
    interview_date: null,
    review_notes: null,
  });

  const insertColumnList = calls[0]!.sql.slice(
    calls[0]!.sql.indexOf('INSERT INTO admission_applications'),
    calls[0]!.sql.indexOf('VALUES'),
  );
  assert.match(insertColumnList, /INSERT INTO admission_applications\s+\(\s+tenant_id,\s+application_number,\s+full_name,/);
  assert.doesNotMatch(insertColumnList, /first_name|last_name|guardian_name|application_status|school_id,/);
  assert.deepEqual(calls[0]!.params.slice(0, 5), [
    'tenant-a',
    'APP-20260623-001',
    'Achieng Otieno',
    '2016-09-12',
    'female',
  ]);
  assert.equal(application.full_name, 'Achieng Otieno');
  assert.equal(application.class_applying, 'Grade 4');
});

test('AdmissionsService persists enquiries with tenant context and records an operational event', async () => {
  const requestContext = new RequestContextService();
  const createdInputs: any[] = [];
  const recordedEvents: any[] = [];
  const service = new AdmissionsService(
    requestContext,
    {} as never,
    {
      createEnquiry: async (input: any) => {
        createdInputs.push(input);
        return {
          id: '00000000-0000-0000-0000-000000000941',
          ...input,
        };
      },
    } as never,
    {} as never,
    {} as never,
    undefined,
    undefined,
    undefined,
    {
      recordSchoolOperation: async (input: any) => {
        recordedEvents.push(input);
        return { status: 'accepted' };
      },
    } as never,
  );

  await requestContext.run(
    {
      request_id: 'req-admissions-enquiry-create',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'admissions',
      session_id: 'session-1',
      permissions: ['admissions:*'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/admissions/enquiries',
      started_at: '2026-06-23T08:00:00.000Z',
    },
    () =>
      service.createEnquiry(
        'tenant-a',
        {
          enquiry_code: ' ENQ-001 ',
          student_first_name: ' Amina ',
          student_last_name: ' Wanjiku ',
          parent_name: ' Grace Wanjiku ',
          parent_phone: ' 0712345678 ',
          class_applying: ' Grade 3 ',
        },
        '00000000-0000-0000-0000-000000000001',
      ),
  );

  assert.equal(createdInputs[0].tenant_id, 'tenant-a');
  assert.equal(createdInputs[0].enquiry_code, 'ENQ-001');
  assert.equal(createdInputs[0].student_first_name, 'Amina');
  assert.equal(createdInputs[0].class_applying, 'Grade 3');
  assert.equal(recordedEvents[0].schoolId, 'tenant-a');
  assert.equal(recordedEvents[0].event.type, 'admissions.enquiry.created');
});

test('AdmissionsService previews canonical school-scoped admission imports', async () => {
  const requestContext = new RequestContextService();
  const service = new AdmissionsService(
    requestContext,
    {} as never,
    {
      getAdmissionFoundation: async () => ({
        academic_years: [
          {
            id: 'year-2026',
            name: '2026 Academic Year',
            starts_on: '2026-01-01',
            ends_on: '2026-12-31',
          },
        ],
        classes: [
          {
            id: 'class-grade-4',
            academic_year_id: 'year-2026',
            name: 'Grade 4',
            grade_level: 'Grade 4',
            curriculum: 'CBC',
            capacity: 50,
            enrolment_open: true,
            student_count: 4,
          },
        ],
        streams: [],
        subjects: [{ id: 'subject-math', name: 'Mathematics' }],
        class_subject_assignments: [
          {
            academic_year_id: 'year-2026',
            class_section_id: 'class-grade-4',
            subject_id: 'subject-math',
          },
        ],
      }),
      findExistingAdmissionNumbers: async () => [],
    } as never,
    {} as never,
    {} as never,
  );

  const preview = await requestContext.run(
    {
      request_id: 'req-admissions-import-preview',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'admissions',
      session_id: 'session-1',
      permissions: ['admissions:*'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/admissions/imports',
      started_at: '2026-05-14T00:00:00.000Z',
    },
    () => service.previewApplicationImport({
      originalname: 'admissions.csv',
      mimetype: 'text/csv',
      size: 480,
      buffer: Buffer.from([
        'admission_number,first_name,middle_name,last_name,gender,date_of_birth,admission_date,academic_year,curriculum,class,stream,guardian_name,guardian_relationship,guardian_phone',
        'G4-001,Achieng,,Otieno,Female,12/09/2016,05/01/2026,2026 Academic Year,CBC,Grade 4,,Janet Otieno,Mother,0700000001',
        'G4-002,Missing,,,,,,,,,,,,',
      ].join('\n')),
    }),
  );

  assert.equal(preview.total_rows, 2);
  assert.equal(preview.valid_rows, 1);
  assert.equal(preview.invalid_rows, 1);
  assert.equal(preview.rows[0].learner_name, 'Achieng Otieno');
  assert.equal(preview.rows[0].record?.class_section_id, 'class-grade-4');
  assert.deepEqual(preview.rows[0].record?.subject_ids, ['subject-math']);
  assert.ok(!preview.rows.some((row) => row.learner_name === 'Joy Kemboi'));
  assert.ok(preview.rows[1].errors.includes('gender is required'));
  assert.ok(!preview.rows[1].errors.includes('date_of_birth is required'));
});

test('AdmissionsService bulk commit persists valid rows and reports failed rows truthfully', async () => {
  const requestContext = new RequestContextService();
  const recordedEvents: any[] = [];
  const service = new AdmissionsService(
    requestContext,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    undefined,
    undefined,
    undefined,
    {
      recordSchoolOperation: async (input: any) => {
        recordedEvents.push(input);
        return { status: 'accepted' };
      },
    } as never,
  );
  const admittedNumbers: string[] = [];
  service.createManualAdmission = async (row: any) => {
    if (row.admission_number === 'BAD-001') throw new BadRequestException('Class is full');
    admittedNumbers.push(row.admission_number);
    return {
      student: { id: `student-${row.admission_number}` },
      placement: { class_name: 'Grade 4' },
    } as any;
  };

  const result = await requestContext.run(
    {
      request_id: 'req-admissions-import-commit',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'admissions',
      session_id: 'session-1',
      permissions: ['admissions:*'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/admissions/imports/commit',
      started_at: '2026-05-14T00:00:00.000Z',
    },
    () => service.commitImports({ rows: [
      { row_number: 2, admission_number: 'GOOD-001' },
      { row_number: 3, admission_number: 'BAD-001' },
    ] as any }),
  );

  assert.equal(result.success, false);
  assert.equal(result.admitted_rows, 1);
  assert.equal(result.failed_rows, 1);
  assert.deepEqual(admittedNumbers, ['GOOD-001']);
  assert.equal(result.results[1].error, 'Class is full');
  assert.equal(recordedEvents.at(-1).event.type, 'admissions.bulk_import.completed');
});

test('AdmissionsService rejects unknown server-side report exports', async () => {
  const requestContext = new RequestContextService();
  const service = new AdmissionsService(
    requestContext,
    {} as never,
    {
      listApplications: async () => {
        throw new Error('applications should not be loaded for an unknown export');
      },
    } as never,
    {} as never,
    {} as never,
  );

  await assert.rejects(
    () =>
      requestContext.run(
        {
          request_id: 'req-admissions-report-export-missing',
          tenant_id: 'tenant-a',
          user_id: '00000000-0000-0000-0000-000000000001',
          role: 'admissions',
          session_id: 'session-1',
          permissions: ['admissions:*'],
          is_authenticated: true,
          client_ip: '127.0.0.1',
          user_agent: 'test-suite',
          method: 'GET',
          path: '/admissions/reports/unknown/export',
          started_at: '2026-05-14T00:00:00.000Z',
        },
        () => service.exportReportCsv('unknown'),
      ),
    /Unknown admissions report export/,
  );
});

test('AdmissionsService invites the parent portal user when registration has a parent email', async () => {
  const requestContext = new RequestContextService();
  const parentInvites: Array<{ email: string; display_name: string; role_code: string }> = [];
  const guardianLinks: Array<{
    school_id: string;
    student_id: string;
    invitation_id: string | null;
    display_name: string;
    email: string;
    phone: string;
    relationship: string;
  }> = [];

  const service = new AdmissionsService(
    requestContext,
    {
      withRequestTransaction: async <T>(callback: () => Promise<T>): Promise<T> => callback(),
    } as never,
    {
      findApplicationByIdForUpdate: async () => ({
        id: '00000000-0000-0000-0000-000000000711',
        tenant_id: 'tenant-a',
        full_name: 'Brian Odhiambo',
        date_of_birth: '2015-08-10',
        gender: 'male',
        birth_certificate_number: 'BC-448299',
        nationality: 'Kenyan',
        class_applying: 'Grade 5',
        status: 'approved',
        parent_name: 'Miriam Odhiambo',
        parent_phone: '254712300499',
        parent_email: ' Miriam.Parent@Example.test ',
        parent_occupation: 'Engineer',
        relationship: 'Mother',
      }),
      markApplicationRegistered: async () => ({
        id: '00000000-0000-0000-0000-000000000711',
        status: 'registered',
      }),
      attachApplicationDocumentsToStudent: async () => [],
      createAllocation: async () => ({
        id: '00000000-0000-0000-0000-000000000713',
        class_name: 'Grade 5',
        stream_name: 'East',
      }),
      findAcademicClassSectionForUpdate: async () => ({
        id: '00000000-0000-0000-0000-000000000716',
        stream_id: '00000000-0000-0000-0000-000000000717',
        class_name: 'Grade 5',
        stream_name: 'East',
        academic_year: '2026',
        capacity: 40,
        current_enrollments: 10,
      }),
      createStudentAcademicEnrollment: async () => ({
        id: '00000000-0000-0000-0000-000000000718',
        student_id: '00000000-0000-0000-0000-000000000712',
        application_id: '00000000-0000-0000-0000-000000000711',
        class_section_id: '00000000-0000-0000-0000-000000000716',
        stream_id: '00000000-0000-0000-0000-000000000717',
        class_name: 'Grade 5',
        stream_name: 'East',
        academic_year: '2026',
        status: 'active',
      }),
      enrollStudentSubjectsAndTimetable: async () => ({
        subject_enrollments: [],
        timetable_enrollments: [],
      }),
      findActiveFeeStructureForClass: async () => null,
      upsertStudentGuardianLink: async (input: {
        school_id: string;
        student_id: string;
        invitation_id: string | null;
        display_name: string;
        email: string;
        phone: string;
        relationship: string;
      }) => {
        guardianLinks.push(input);
        return {
          id: '00000000-0000-0000-0000-000000000714',
          student_id: input.student_id,
          invitation_id: input.invitation_id,
          display_name: input.display_name,
          email: input.email,
          relationship: input.relationship,
          status: 'invited',
        };
      },
    } as never,
    {
      save: async () => {
        throw new Error('not used in this test');
      },
    } as never,
    {
      createStudent: async () => ({
        id: '00000000-0000-0000-0000-000000000712',
        tenant_id: 'tenant-a',
        admission_number: 'ADM-G5-044',
        first_name: 'Brian',
        last_name: 'Odhiambo',
        middle_name: null,
        status: 'active',
        date_of_birth: '2015-08-10',
        gender: 'male',
        primary_guardian_name: 'Miriam Odhiambo',
        primary_guardian_phone: '254712300499',
        metadata: {},
        created_by_user_id: '00000000-0000-0000-0000-000000000001',
        created_at: new Date('2026-05-04T10:00:00.000Z'),
        updated_at: new Date('2026-05-04T10:00:00.000Z'),
      }),
    } as never,
    {
      inviteTenantUser: async (input: { email: string; display_name: string; role_code: string }) => {
        parentInvites.push(input);
        return {
          id: '00000000-0000-0000-0000-000000000715',
          tenant_id: 'tenant-a',
          email: input.email,
          display_name: input.display_name,
          role_code: 'parent',
          invitation_sent: true,
          expires_at: new Date('2026-05-20T10:00:00.000Z').toISOString(),
        };
      },
    } as never,
  );

  const response = await requestContext.run(
    {
      request_id: 'req-admissions-register-parent-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'admissions',
      session_id: 'session-1',
      permissions: ['admissions:*', 'students:*', 'users:write', 'tenant_memberships:write'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/admissions/applications/00000000-0000-0000-0000-000000000711/register',
      started_at: '2026-05-04T00:00:00.000Z',
    },
    () =>
      service.registerApprovedApplication('00000000-0000-0000-0000-000000000711', {
        admission_number: 'ADM-G5-044',
        class_name: 'Grade 5',
        stream_name: 'East',
      }),
  );

  assert.deepEqual(parentInvites, [
    {
      email: 'miriam.parent@example.test',
      display_name: 'Miriam Odhiambo',
      role_code: 'parent',
    },
  ]);
  assert.deepEqual(guardianLinks, [
    {
      school_id: 'tenant-a',
      student_id: '00000000-0000-0000-0000-000000000712',
      invitation_id: '00000000-0000-0000-0000-000000000715',
      display_name: 'Miriam Odhiambo',
      email: 'miriam.parent@example.test',
      phone: '+254712300499',
      relationship: 'Mother',
    },
  ]);
  assert.equal(response.parent_invitation?.invitation_sent, true);
  assert.equal(
    (response.guardian_link as unknown as { status?: string } | null)?.status,
    'invited',
  );
});

test('AdmissionsService assigns fees and creates a student fee invoice during registration', async () => {
  const requestContext = new RequestContextService();
  const feeAssignments: Array<{
    school_id: string;
    student_id: string;
    application_id: string;
    fee_structure_id: string;
    invoice_number: string;
    description: string;
    currency_code: string;
    amount_minor: string;
    due_date: string;
  }> = [];

  const service = new AdmissionsService(
    requestContext,
    {
      withRequestTransaction: async <T>(callback: () => Promise<T>): Promise<T> => callback(),
    } as never,
    {
      findApplicationByIdForUpdate: async () => ({
        id: '00000000-0000-0000-0000-000000000731',
        tenant_id: 'tenant-a',
        full_name: 'Fee Ready Student',
        date_of_birth: '2015-08-10',
        gender: 'female',
        birth_certificate_number: 'BC-448301',
        nationality: 'Kenyan',
        class_applying: 'Grade 6',
        status: 'approved',
        parent_name: 'Fee Parent',
        parent_phone: '254712300501',
        parent_email: null,
        parent_occupation: 'Nurse',
        relationship: 'Guardian',
      }),
      markApplicationRegistered: async () => ({
        id: '00000000-0000-0000-0000-000000000731',
        status: 'registered',
      }),
      attachApplicationDocumentsToStudent: async () => [],
      createAllocation: async () => ({
        id: '00000000-0000-0000-0000-000000000733',
        class_name: 'Grade 6',
        stream_name: 'North',
      }),
      findAcademicClassSectionForUpdate: async () => ({
        id: '00000000-0000-0000-0000-000000000737',
        stream_id: '00000000-0000-0000-0000-000000000738',
        class_name: 'Grade 6',
        stream_name: 'North',
        academic_year: '2026',
        capacity: 40,
        current_enrollments: 10,
      }),
      createStudentAcademicEnrollment: async () => ({
        id: '00000000-0000-0000-0000-000000000739',
        student_id: '00000000-0000-0000-0000-000000000732',
        application_id: '00000000-0000-0000-0000-000000000731',
        class_section_id: '00000000-0000-0000-0000-000000000737',
        stream_id: '00000000-0000-0000-0000-000000000738',
        class_name: 'Grade 6',
        stream_name: 'North',
        academic_year: '2026',
        status: 'active',
      }),
      enrollStudentSubjectsAndTimetable: async () => ({
        subject_enrollments: [],
        timetable_enrollments: [],
      }),
      findActiveFeeStructureForClass: async (_tenantId: string, className: string) => ({
        id: '00000000-0000-0000-0000-000000000734',
        class_name: className,
        academic_year: '2026',
        term_name: 'Term 2',
        description: 'Grade 6 Term 2 fees',
        currency_code: 'KES',
        amount_minor: '4500000',
        due_days_after_registration: 14,
      }),
      createStudentFeeAssignmentInvoice: async (input: {
        school_id: string;
        student_id: string;
        application_id: string;
        fee_structure_id: string;
        invoice_number: string;
        description: string;
        currency_code: string;
        amount_minor: string;
        due_date: string;
      }) => {
        feeAssignments.push(input);
        return {
          assignment: {
            id: '00000000-0000-0000-0000-000000000735',
            fee_structure_id: input.fee_structure_id,
            student_id: input.student_id,
            status: 'assigned',
          },
          invoice: {
            id: '00000000-0000-0000-0000-000000000736',
            invoice_number: input.invoice_number,
            status: 'open',
            amount_due_minor: input.amount_minor,
            currency_code: input.currency_code,
            due_date: input.due_date,
          },
        };
      },
    } as never,
    {
      save: async () => {
        throw new Error('not used in this test');
      },
    } as never,
    {
      createStudent: async () => ({
        id: '00000000-0000-0000-0000-000000000732',
        tenant_id: 'tenant-a',
        admission_number: 'ADM-G6-020',
        first_name: 'Fee',
        last_name: 'Student',
        middle_name: 'Ready',
        status: 'active',
        date_of_birth: '2015-08-10',
        gender: 'female',
        primary_guardian_name: 'Fee Parent',
        primary_guardian_phone: '254712300501',
        metadata: {},
        created_by_user_id: '00000000-0000-0000-0000-000000000001',
        created_at: new Date('2026-05-04T10:00:00.000Z'),
        updated_at: new Date('2026-05-04T10:00:00.000Z'),
      }),
    } as never,
  );

  const response = await requestContext.run(
    {
      request_id: 'req-admissions-register-fees-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'admissions',
      session_id: 'session-1',
      permissions: ['admissions:*', 'students:*', 'finance:*'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/admissions/applications/00000000-0000-0000-0000-000000000731/register',
      started_at: '2026-05-04T00:00:00.000Z',
    },
    () =>
      service.registerApprovedApplication('00000000-0000-0000-0000-000000000731', {
        admission_number: 'ADM-G6-020',
        class_name: 'Grade 6',
        stream_name: 'North',
      }),
  );

  assert.equal(feeAssignments.length, 1);
  assert.equal(feeAssignments[0]?.student_id, '00000000-0000-0000-0000-000000000732');
  assert.equal(feeAssignments[0]?.application_id, '00000000-0000-0000-0000-000000000731');
  assert.equal(feeAssignments[0]?.fee_structure_id, '00000000-0000-0000-0000-000000000734');
  assert.match(feeAssignments[0]?.invoice_number ?? '', /^SF-\d{8}-[A-Z0-9]{8}$/);
  assert.equal(feeAssignments[0]?.description, 'Grade 6 Term 2 fees');
  assert.equal(feeAssignments[0]?.currency_code, 'KES');
  assert.equal(feeAssignments[0]?.amount_minor, '4500000');
  assert.match(feeAssignments[0]?.due_date ?? '', /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(
    (response as unknown as { fee_assignment?: { status?: string } }).fee_assignment?.status,
    'assigned',
  );
  assert.equal(
    (response as unknown as { fee_invoice?: { status?: string } }).fee_invoice?.status,
    'open',
  );
});

test('AdmissionsService creates an academic enrollment when class capacity is available', async () => {
  const requestContext = new RequestContextService();
  const enrollments: Array<{
    school_id: string;
    student_id: string;
    application_id: string;
    class_section_id: string | null;
    class_name: string;
    stream_name: string;
    academic_year: string;
  }> = [];

  const service = new AdmissionsService(
    requestContext,
    {
      withRequestTransaction: async <T>(callback: () => Promise<T>): Promise<T> => callback(),
    } as never,
    {
      findApplicationByIdForUpdate: async () => ({
        id: '00000000-0000-0000-0000-000000000741',
        tenant_id: 'tenant-a',
        full_name: 'Enrolled Student',
        date_of_birth: '2015-08-10',
        gender: 'male',
        birth_certificate_number: 'BC-448302',
        nationality: 'Kenyan',
        class_applying: 'Grade 4',
        status: 'approved',
        parent_name: 'Enrollment Parent',
        parent_phone: '254712300502',
        parent_email: null,
        relationship: 'Father',
      }),
      findAcademicClassSectionForUpdate: async () => ({
        id: '00000000-0000-0000-0000-000000000744',
        stream_id: '00000000-0000-0000-0000-000000000746',
        class_name: 'Grade 4',
        stream_name: 'West',
        academic_year: '2026',
        capacity: 40,
        current_enrollments: 17,
      }),
      markApplicationRegistered: async () => ({
        id: '00000000-0000-0000-0000-000000000741',
        status: 'registered',
      }),
      attachApplicationDocumentsToStudent: async () => [],
      createAllocation: async () => ({
        id: '00000000-0000-0000-0000-000000000743',
        class_name: 'Grade 4',
        stream_name: 'West',
      }),
      createStudentAcademicEnrollment: async (input: {
        school_id: string;
        student_id: string;
        application_id: string;
        class_section_id: string | null;
        class_name: string;
        stream_name: string;
        academic_year: string;
      }) => {
        enrollments.push(input);
        return {
          id: '00000000-0000-0000-0000-000000000745',
          student_id: input.student_id,
          class_name: input.class_name,
          stream_name: input.stream_name,
          academic_year: input.academic_year,
          status: 'active',
        };
      },
      enrollStudentSubjectsAndTimetable: async () => ({
        subject_enrollments: [],
        timetable_enrollments: [],
      }),
      findActiveFeeStructureForClass: async () => null,
    } as never,
    {
      save: async () => {
        throw new Error('not used in this test');
      },
    } as never,
    {
      createStudent: async () => ({
        id: '00000000-0000-0000-0000-000000000742',
        tenant_id: 'tenant-a',
        admission_number: 'ADM-G4-021',
        first_name: 'Enrolled',
        last_name: 'Student',
        middle_name: null,
        status: 'active',
        date_of_birth: '2015-08-10',
        gender: 'male',
        primary_guardian_name: 'Enrollment Parent',
        primary_guardian_phone: '254712300502',
        metadata: {},
        created_by_user_id: '00000000-0000-0000-0000-000000000001',
        created_at: new Date('2026-05-04T10:00:00.000Z'),
        updated_at: new Date('2026-05-04T10:00:00.000Z'),
      }),
    } as never,
  );

  const response = await requestContext.run(
    {
      request_id: 'req-admissions-register-enrollment-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'admissions',
      session_id: 'session-1',
      permissions: ['admissions:*', 'students:*'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/admissions/applications/00000000-0000-0000-0000-000000000741/register',
      started_at: '2026-05-04T00:00:00.000Z',
    },
    () =>
      service.registerApprovedApplication('00000000-0000-0000-0000-000000000741', {
        admission_number: 'ADM-G4-021',
        class_name: 'Grade 4',
        stream_name: 'West',
      }),
  );

  assert.deepEqual(enrollments, [
    {
      school_id: 'tenant-a',
      student_id: '00000000-0000-0000-0000-000000000742',
      application_id: '00000000-0000-0000-0000-000000000741',
      class_section_id: '00000000-0000-0000-0000-000000000744',
      stream_id: '00000000-0000-0000-0000-000000000746',
      class_name: 'Grade 4',
      stream_name: 'West',
      academic_year: '2026',
    },
  ]);
  assert.equal(
    (response as unknown as { academic_enrollment?: { status?: string } }).academic_enrollment?.status,
    'active',
  );
});

test('AdmissionsService enrolls registered students into configured subjects and timetable slots', async () => {
  const requestContext = new RequestContextService();
  const academicEnrollmentId = '00000000-0000-0000-0000-000000000765';
  const subjectTimetableCalls: Array<{
    school_id: string;
    student_id: string;
    academic_enrollment_id: string;
    class_section_id: string | null;
  }> = [];

  const service = new AdmissionsService(
    requestContext,
    {
      withRequestTransaction: async <T>(callback: () => Promise<T>): Promise<T> => callback(),
    } as never,
    {
      findApplicationByIdForUpdate: async () => ({
        id: '00000000-0000-0000-0000-000000000761',
        tenant_id: 'tenant-a',
        full_name: 'Subject Ready',
        date_of_birth: '2015-08-10',
        gender: 'female',
        birth_certificate_number: 'BC-448304',
        nationality: 'Kenyan',
        class_applying: 'Grade 8',
        status: 'approved',
        parent_name: 'Subject Parent',
        parent_phone: '254712300504',
        parent_email: null,
        relationship: 'Guardian',
      }),
      findAcademicClassSectionForUpdate: async () => ({
        id: '00000000-0000-0000-0000-000000000764',
        stream_id: '00000000-0000-0000-0000-000000000765',
        class_name: 'Grade 8',
        stream_name: 'South',
        academic_year: '2026',
        capacity: 35,
        current_enrollments: 12,
      }),
      markApplicationRegistered: async () => ({
        id: '00000000-0000-0000-0000-000000000761',
        status: 'registered',
      }),
      attachApplicationDocumentsToStudent: async () => [],
      createAllocation: async () => ({
        id: '00000000-0000-0000-0000-000000000763',
        class_name: 'Grade 8',
        stream_name: 'South',
      }),
      createStudentAcademicEnrollment: async () => ({
        id: academicEnrollmentId,
        student_id: '00000000-0000-0000-0000-000000000762',
        class_name: 'Grade 8',
        stream_name: 'South',
        academic_year: '2026',
        status: 'active',
      }),
      enrollStudentSubjectsAndTimetable: async (input: {
        school_id: string;
        student_id: string;
        academic_enrollment_id: string;
        class_section_id: string | null;
      }) => {
        subjectTimetableCalls.push(input);
        return {
          subject_enrollments: [
            {
              id: '00000000-0000-0000-0000-000000000766',
              subject_code: 'MATH',
              subject_name: 'Mathematics',
              status: 'active',
            },
            {
              id: '00000000-0000-0000-0000-000000000767',
              subject_code: 'ENG',
              subject_name: 'English',
              status: 'active',
            },
          ],
          timetable_enrollments: [
            {
              id: '00000000-0000-0000-0000-000000000768',
              day_of_week: 'Monday',
              starts_at: '08:00',
              ends_at: '08:40',
              status: 'active',
            },
          ],
        };
      },
      findActiveFeeStructureForClass: async () => null,
    } as never,
    {
      save: async () => {
        throw new Error('not used in this test');
      },
    } as never,
    {
      createStudent: async () => ({
        id: '00000000-0000-0000-0000-000000000762',
        tenant_id: 'tenant-a',
        admission_number: 'ADM-G8-023',
        first_name: 'Subject',
        last_name: 'Ready',
        middle_name: null,
        status: 'active',
        date_of_birth: '2015-08-10',
        gender: 'female',
        primary_guardian_name: 'Subject Parent',
        primary_guardian_phone: '254712300504',
        metadata: {},
        created_by_user_id: '00000000-0000-0000-0000-000000000001',
        created_at: new Date('2026-05-04T10:00:00.000Z'),
        updated_at: new Date('2026-05-04T10:00:00.000Z'),
      }),
    } as never,
  );

  const response = await requestContext.run(
    {
      request_id: 'req-admissions-register-subjects-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'admissions',
      session_id: 'session-1',
      permissions: ['admissions:*', 'students:*'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/admissions/applications/00000000-0000-0000-0000-000000000761/register',
      started_at: '2026-05-04T00:00:00.000Z',
    },
    () =>
      service.registerApprovedApplication('00000000-0000-0000-0000-000000000761', {
        admission_number: 'ADM-G8-023',
        class_name: 'Grade 8',
        stream_name: 'South',
      }),
  );

  assert.deepEqual(subjectTimetableCalls, [
    {
      school_id: 'tenant-a',
      student_id: '00000000-0000-0000-0000-000000000762',
      academic_enrollment_id: academicEnrollmentId,
      class_section_id: '00000000-0000-0000-0000-000000000764',
    },
  ]);
  assert.equal(
    (response as unknown as { subject_enrollments?: unknown[] }).subject_enrollments?.length,
    2,
  );
  assert.equal(
    (response as unknown as { timetable_enrollments?: unknown[] }).timetable_enrollments?.length,
    1,
  );
});

test('AdmissionsService publishes academic enrollment hooks during registration', async () => {
  const requestContext = new RequestContextService();
  const publishedEvents: Array<{
    event_name: string;
    aggregate_id: string;
    payload: Record<string, unknown>;
  }> = [];

  const service = new AdmissionsService(
    requestContext,
    {
      withRequestTransaction: async <T>(callback: () => Promise<T>): Promise<T> => callback(),
    } as never,
    {
      findApplicationByIdForUpdate: async () => ({
        id: '00000000-0000-0000-0000-000000000791',
        tenant_id: 'tenant-a',
        full_name: 'Hook Ready',
        date_of_birth: '2015-09-11',
        gender: 'female',
        birth_certificate_number: 'BC-448309',
        nationality: 'Kenyan',
        class_applying: 'Grade 8',
        status: 'approved',
        parent_name: 'Hook Parent',
        parent_phone: '254712300509',
        parent_email: null,
        relationship: 'Guardian',
      }),
      findAcademicClassSectionForUpdate: async () => ({
        id: '00000000-0000-0000-0000-000000000794',
        stream_id: '00000000-0000-0000-0000-000000000796',
        class_name: 'Grade 8',
        stream_name: 'South',
        academic_year: '2026',
        capacity: 35,
        current_enrollments: 12,
      }),
      markApplicationRegistered: async () => ({
        id: '00000000-0000-0000-0000-000000000791',
        status: 'registered',
      }),
      attachApplicationDocumentsToStudent: async () => [],
      createAllocation: async () => ({
        id: '00000000-0000-0000-0000-000000000793',
        class_name: 'Grade 8',
        stream_name: 'South',
      }),
      createStudentAcademicEnrollment: async () => ({
        id: '00000000-0000-0000-0000-000000000795',
        student_id: '00000000-0000-0000-0000-000000000792',
        application_id: '00000000-0000-0000-0000-000000000791',
        class_section_id: '00000000-0000-0000-0000-000000000794',
        class_name: 'Grade 8',
        stream_name: 'South',
        academic_year: '2026',
        status: 'active',
      }),
      enrollStudentSubjectsAndTimetable: async () => ({
        subject_enrollments: [],
        timetable_enrollments: [],
      }),
      findActiveFeeStructureForClass: async () => null,
    } as never,
    {
      save: async () => {
        throw new Error('not used in this test');
      },
    } as never,
    {
      createStudent: async () => ({
        id: '00000000-0000-0000-0000-000000000792',
        tenant_id: 'tenant-a',
        admission_number: 'ADM-G8-029',
        first_name: 'Hook',
        last_name: 'Ready',
        middle_name: null,
        status: 'active',
        date_of_birth: '2015-09-11',
        gender: 'female',
        primary_guardian_name: 'Hook Parent',
        primary_guardian_phone: '254712300509',
        metadata: {},
        created_by_user_id: '00000000-0000-0000-0000-000000000001',
        created_at: new Date('2026-05-04T10:00:00.000Z'),
        updated_at: new Date('2026-05-04T10:00:00.000Z'),
      }),
    } as never,
    undefined,
    {
      publish: async (input: {
        event_name: string;
        aggregate_id: string;
        payload: Record<string, unknown>;
      }) => {
        publishedEvents.push(input);
        return input;
      },
    } as never,
  );

  await requestContext.run(
    {
      request_id: 'req-admissions-register-hooks-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'admissions',
      session_id: 'session-1',
      permissions: ['admissions:*', 'students:*'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/admissions/applications/00000000-0000-0000-0000-000000000791/register',
      started_at: '2026-05-04T00:00:00.000Z',
    },
    () =>
      service.registerApprovedApplication('00000000-0000-0000-0000-000000000791', {
        admission_number: 'ADM-G8-029',
        class_name: 'Grade 8',
        stream_name: 'South',
      }),
  );

  assert.equal(publishedEvents.length, 1);
  assert.equal(publishedEvents[0]?.event_name, 'student.academic_enrollment.created');
  assert.equal(publishedEvents[0]?.aggregate_id, '00000000-0000-0000-0000-000000000795');
  assert.equal(
    publishedEvents[0]?.payload.academic_enrollment_id,
    '00000000-0000-0000-0000-000000000795',
  );
});

test('AdmissionsService routes annual promotion through the atomic cohort service with the authenticated school identity', async () => {
  const requestContext = new RequestContextService();
  let observed: any;
  const cohort = {promoteSingle:async(actor:any,studentId:string,dto:any)=>{
    observed={actor,studentId,dto};return {promoted_students:1,cohort_id:'cohort-1'};
  }};
  const service = new AdmissionsService(requestContext,{} as never,{} as never,{} as never,{} as never,
    undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,cohort as never);
  const dto={action:'promotion' as const,target_class_section_id:'next-class',target_stream_id:'east',reason:'Annual promotion'};
  const response=await requestContext.run({tenant_id:'tenant-a',user_id:'actor-a',role:'admissions'} as never,
    ()=>service.advanceStudentAcademicLifecycle('learner-a',dto));
  assert.equal(response.promoted_students,1);
  assert.equal(observed.actor.tenantId,'tenant-a');
  assert.equal(observed.actor.userId,'actor-a');
  assert.equal(observed.studentId,'learner-a');
  assert.deepEqual(observed.dto,dto);
});

test('AdmissionsService graduates an active student and records an academic lifecycle event', async () => {
  const requestContext = new RequestContextService();
  const statusUpdates: string[] = [];
  const lifecycleEvents: any[] = [];

  const service = new AdmissionsService(
    requestContext,
    {
      withRequestTransaction: async <T>(callback: () => Promise<T>): Promise<T> => callback(),
    } as never,
    {
      findActiveAcademicEnrollmentForUpdate: async () => ({
        id: '00000000-0000-0000-0000-000000000781',
        student_id: '00000000-0000-0000-0000-000000000780',
        application_id: '00000000-0000-0000-0000-000000000779',
        class_section_id: '00000000-0000-0000-0000-000000000782',
        class_name: 'Grade 12',
        stream_name: 'East',
        academic_year: '2026',
        status: 'active',
      }),
      completeStudentAcademicEnrollment: async () => ({ id: '00000000-0000-0000-0000-000000000781', status: 'completed' }),
      createStudentAcademicLifecycleEvent: async () => ({
        id: '00000000-0000-0000-0000-000000000783',
        event_type: 'graduation',
      }),
    } as never,
    {
      save: async () => {
        throw new Error('not used in this test');
      },
    } as never,
    {
      updateStudent: async (_studentId: string, dto: { status?: string }) => {
        statusUpdates.push(dto.status ?? '');
        return { id: '00000000-0000-0000-0000-000000000780', status: dto.status };
      },
    } as never,
    undefined,
    { publish: async (event: any) => { lifecycleEvents.push(event); } } as never,
  );

  const response = await requestContext.run(
    {
      request_id: 'req-admissions-graduate-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'admissions',
      session_id: 'session-1',
      permissions: ['admissions:*', 'students:*'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/admissions/students/00000000-0000-0000-0000-000000000780/academic-lifecycle',
      started_at: '2026-05-04T00:00:00.000Z',
    },
    () =>
      (
        service as unknown as {
          advanceStudentAcademicLifecycle: (studentId: string, dto: Record<string, string>) => Promise<{
            lifecycle_event: { event_type: string };
            student_status: string;
          }>;
        }
      ).advanceStudentAcademicLifecycle('00000000-0000-0000-0000-000000000780', {
        action: 'graduation',
        reason: 'Completed final class',
      }),
  );

  assert.deepEqual(statusUpdates, ['graduated']);
  assert.equal(response.lifecycle_event.event_type, 'graduation');
  assert.equal(response.student_status, 'graduated');
  assert.equal(lifecycleEvents[0]?.event_name, 'student.academic_lifecycle.changed');
  assert.equal(lifecycleEvents[0]?.payload.event_type, 'graduation');
  assert.equal(lifecycleEvents[0]?.payload.tenant_id, 'tenant-a');
});

test('AdmissionsService rejects lifecycle changes without an active academic enrollment', async () => {
  const requestContext = new RequestContextService();

  const service = new AdmissionsService(
    requestContext,
    {
      withRequestTransaction: async <T>(callback: () => Promise<T>): Promise<T> => callback(),
    } as never,
    {
      findActiveAcademicEnrollmentForUpdate: async () => null,
    } as never,
    {
      save: async () => {
        throw new Error('not used in this test');
      },
    } as never,
    {
      updateStudent: async () => {
        throw new Error('should not update a student without an active enrollment');
      },
    } as never,
  );

  await assert.rejects(
    () =>
      requestContext.run(
        {
          request_id: 'req-admissions-lifecycle-missing-1',
          tenant_id: 'tenant-a',
          user_id: '00000000-0000-0000-0000-000000000001',
          role: 'admissions',
          session_id: 'session-1',
          permissions: ['admissions:*', 'students:*'],
          is_authenticated: true,
          client_ip: '127.0.0.1',
          user_agent: 'test-suite',
          method: 'POST',
          path: '/admissions/students/00000000-0000-0000-0000-000000000790/academic-lifecycle',
          started_at: '2026-05-04T00:00:00.000Z',
        },
        () =>
          (
            service as unknown as {
              advanceStudentAcademicLifecycle: (studentId: string, dto: Record<string, string>) => Promise<unknown>;
            }
          ).advanceStudentAcademicLifecycle('00000000-0000-0000-0000-000000000790', {
            action: 'archive',
            reason: 'Left school',
          }),
      ),
    /No active academic enrollment/,
  );
});

test('AdmissionsService blocks registration when configured class capacity is full', async () => {
  const requestContext = new RequestContextService();
  let createStudentCalls = 0;

  const service = new AdmissionsService(
    requestContext,
    {
      withRequestTransaction: async <T>(callback: () => Promise<T>): Promise<T> => callback(),
    } as never,
    {
      findApplicationByIdForUpdate: async () => ({
        id: '00000000-0000-0000-0000-000000000751',
        tenant_id: 'tenant-a',
        full_name: 'Blocked Student',
        date_of_birth: '2015-08-10',
        gender: 'female',
        birth_certificate_number: 'BC-448303',
        nationality: 'Kenyan',
        class_applying: 'Grade 4',
        status: 'approved',
        parent_name: 'Blocked Parent',
        parent_phone: '254712300503',
        parent_email: null,
        relationship: 'Mother',
      }),
      findAcademicClassSectionForUpdate: async () => ({
        id: '00000000-0000-0000-0000-000000000754',
        stream_id: '00000000-0000-0000-0000-000000000755',
        class_name: 'Grade 4',
        stream_name: 'Full',
        academic_year: '2026',
        capacity: 30,
        current_enrollments: 30,
      }),
      createStudentAcademicEnrollment: async () => {
        throw new Error('academic enrollment should not be created');
      },
      findActiveFeeStructureForClass: async () => {
        throw new Error('fees should not be assigned');
      },
    } as never,
    {
      save: async () => {
        throw new Error('not used in this test');
      },
    } as never,
    {
      createStudent: async () => {
        createStudentCalls += 1;
        throw new Error('student should not be created');
      },
    } as never,
  );

  await assert.rejects(
    () =>
      requestContext.run(
        {
          request_id: 'req-admissions-register-capacity-1',
          tenant_id: 'tenant-a',
          user_id: '00000000-0000-0000-0000-000000000001',
          role: 'admissions',
          session_id: 'session-1',
          permissions: ['admissions:*', 'students:*'],
          is_authenticated: true,
          client_ip: '127.0.0.1',
          user_agent: 'test-suite',
          method: 'POST',
          path: '/admissions/applications/00000000-0000-0000-0000-000000000751/register',
          started_at: '2026-05-04T00:00:00.000Z',
        },
        () =>
          service.registerApprovedApplication('00000000-0000-0000-0000-000000000751', {
            admission_number: 'ADM-G4-022',
            class_name: 'Grade 4',
            stream_name: 'Full',
          }),
      ),
    /Class section "Grade 4 Full" is at capacity/,
  );
  assert.equal(createStudentCalls, 0);
});

test('AdmissionsService registration is idempotent for an already registered application', async () => {
  const requestContext = new RequestContextService();
  let createStudentCalls = 0;
  let inviteParentCalls = 0;
  let smsQueueCalls = 0;
  let schoolOperationCalls = 0;

  const service = new AdmissionsService(
    requestContext,
    {
      withRequestTransaction: async <T>(callback: () => Promise<T>): Promise<T> => callback(),
    } as never,
    {
      findApplicationById: async () => ({
        id: '00000000-0000-0000-0000-000000000721',
        tenant_id: 'tenant-a',
        full_name: 'Already Registered',
        date_of_birth: '2015-08-10',
        gender: 'female',
        birth_certificate_number: 'BC-448300',
        nationality: 'Kenyan',
        class_applying: 'Grade 5',
        status: 'registered',
        admitted_student_id: '00000000-0000-0000-0000-000000000722',
        parent_name: 'Existing Parent',
        parent_phone: '254712300500',
        parent_email: 'existing.parent@example.test',
        parent_occupation: 'Teacher',
        relationship: 'Mother',
      }),
      findApplicationByIdForUpdate: async () => ({
        id: '00000000-0000-0000-0000-000000000721',
        tenant_id: 'tenant-a',
        full_name: 'Already Registered',
        date_of_birth: '2015-08-10',
        gender: 'female',
        birth_certificate_number: 'BC-448300',
        nationality: 'Kenyan',
        class_applying: 'Grade 5',
        status: 'registered',
        admitted_student_id: '00000000-0000-0000-0000-000000000722',
        parent_name: 'Existing Parent',
        parent_phone: '254712300500',
        parent_email: 'existing.parent@example.test',
        parent_occupation: 'Teacher',
        relationship: 'Mother',
      }),
      findCurrentAllocationByStudentId: async () => ({
        id: '00000000-0000-0000-0000-000000000723',
        class_name: 'Grade 5',
        stream_name: 'East',
        dormitory_name: null,
        transport_route: null,
      }),
      markApplicationRegistered: async () => {
        throw new Error('registration should not be marked again');
      },
      attachApplicationDocumentsToStudent: async () => {
        throw new Error('documents should not be reattached');
      },
      createAllocation: async () => {
        throw new Error('allocation should not be recreated');
      },
    } as never,
    {
      save: async () => {
        throw new Error('not used in this test');
      },
    } as never,
    {
      createStudent: async () => {
        createStudentCalls += 1;
        throw new Error('student should not be recreated');
      },
      getStudent: async () => ({
        id: '00000000-0000-0000-0000-000000000722',
        tenant_id: 'tenant-a',
        admission_number: 'ADM-G5-044',
        first_name: 'Already',
        last_name: 'Registered',
        middle_name: null,
        status: 'active',
        date_of_birth: '2015-08-10',
        gender: 'female',
        primary_guardian_name: 'Existing Parent',
        primary_guardian_phone: '254712300500',
        metadata: {},
        created_by_user_id: '00000000-0000-0000-0000-000000000001',
        created_at: '2026-05-04T10:00:00.000Z',
        updated_at: '2026-05-04T10:00:00.000Z',
      }),
    } as never,
    {
      inviteTenantUser: async () => {
        inviteParentCalls += 1;
        throw new Error('parent should not be reinvited');
      },
    } as never,
    undefined,
    undefined,
    {
      recordSchoolOperation: async () => {
        schoolOperationCalls += 1;
        throw new Error('operation event should not be replayed');
      },
    } as never,
    undefined,
    undefined,
    {
      sendSms: async () => {
        smsQueueCalls += 1;
        throw new Error('SMS should not be requeued');
      },
    } as never,
  );

  const response = await requestContext.run(
    {
      request_id: 'req-admissions-register-idempotent-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'admissions',
      session_id: 'session-1',
      permissions: ['admissions:*', 'students:*', 'users:write', 'tenant_memberships:write'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/admissions/applications/00000000-0000-0000-0000-000000000721/register',
      started_at: '2026-05-04T00:00:00.000Z',
    },
    () =>
      service.registerApprovedApplication('00000000-0000-0000-0000-000000000721', {
        admission_number: 'ADM-G5-044',
        class_name: 'Grade 5',
        stream_name: 'East',
      }),
  );

  assert.equal(response.student.id, '00000000-0000-0000-0000-000000000722');
  assert.equal(response.allocation?.stream_name, 'East');
  assert.equal(response.application_status, 'registered');
  assert.equal(response.parent_invitation, null);
  assert.equal(response.idempotent_replay, true);
  assert.equal(response.notification_delivery.guardian_sms.status, 'not_requeued');
  assert.equal(response.notification_delivery.guardian_sms.reason, 'application_already_registered');
  assert.equal(response.operation_event.status, 'not_replayed');
  assert.equal(createStudentCalls, 0);
  assert.equal(inviteParentCalls, 0);
  assert.equal(smsQueueCalls, 0);
  assert.equal(schoolOperationCalls, 0);
});

test('AdmissionsService stores uploaded document metadata with pending verification', async () => {
  const requestContext = new RequestContextService();

  const service = new AdmissionsService(
    requestContext,
    {
      withRequestTransaction: async <T>(callback: () => Promise<T>): Promise<T> => callback(),
    } as never,
    {
      findApplicationById: async () => ({
        id: '00000000-0000-0000-0000-000000000701',
        tenant_id: 'tenant-a',
        status: 'pending',
      }),
      saveDocumentRecord: async () => ({
        id: '00000000-0000-0000-0000-000000000801',
        application_id: '00000000-0000-0000-0000-000000000701',
        student_id: null,
        verification_status: 'pending',
        document_type: 'birth_certificate',
        original_file_name: 'birth-cert-brenda.pdf',
      }),
    } as never,
    {
      save: async () => ({
        stored_path: 'tenant-a/admissions/2026/05/birth-cert-brenda.pdf',
        original_file_name: 'birth-cert-brenda.pdf',
        mime_type: 'application/pdf',
        size_bytes: 204800,
      }),
    } as never,
    {
      createStudent: async () => {
        throw new Error('not used in this test');
      },
    } as never,
  );

  const response = await requestContext.run(
    {
      request_id: 'req-admissions-doc-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'admissions',
      session_id: 'session-1',
      permissions: ['admissions:*', 'documents:*'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/admissions/applications/00000000-0000-0000-0000-000000000701/documents',
      started_at: '2026-05-04T00:00:00.000Z',
    },
    () =>
      service.storeApplicationDocument(
        '00000000-0000-0000-0000-000000000701',
        {
          document_type: 'birth_certificate',
          uploaded_by_user_id: '00000000-0000-0000-0000-000000000001',
        },
        {
          originalname: 'birth-cert-brenda.pdf',
          mimetype: 'application/pdf',
          size: 204800,
          buffer: Buffer.from('%PDF-1.7\nadmission document'),
        },
      ),
  );

  assert.equal(response.verification_status, 'pending');
  assert.equal(response.document_type, 'birth_certificate');
});

test('AdmissionsService scans uploaded documents before tenant file persistence when upload scanning is configured', async () => {
  const requestContext = new RequestContextService();
  const captured: Record<string, unknown> = {};

  const service = new AdmissionsService(
    requestContext,
    {
      withRequestTransaction: async <T>(callback: () => Promise<T>): Promise<T> => callback(),
    } as never,
    {
      findApplicationById: async () => ({
        id: '00000000-0000-0000-0000-000000000701',
        tenant_id: 'tenant-a',
        status: 'pending',
      }),
      saveDocumentRecord: async () => ({
        id: '00000000-0000-0000-0000-000000000801',
        application_id: '00000000-0000-0000-0000-000000000701',
        student_id: null,
        verification_status: 'pending',
        document_type: 'birth_certificate',
        original_file_name: 'birth-cert-brenda.pdf',
      }),
    } as never,
    {
      save: async (input: Record<string, unknown>) => {
        captured.savedFile = input.file;
        return {
          stored_path: 'tenant/tenant-a/admissions/2026/05/birth-cert-brenda.pdf',
          original_file_name: 'birth-cert-brenda.pdf',
          mime_type: 'application/pdf',
          size_bytes: 204800,
        };
      },
    } as never,
    {
      createStudent: async () => {
        throw new Error('not used in this test');
      },
    } as never,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      scanIfConfigured: async (file: Record<string, unknown>) => {
        captured.scannedFile = file;
        return {
          provider: 'webhook',
          status: 'clean',
          scannedAt: '2026-05-14T14:30:00.000Z',
          scanId: 'scan-admissions-1',
        };
      },
    } as never,
  );

  await requestContext.run(
    {
      request_id: 'req-admissions-doc-scan-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'admissions',
      session_id: 'session-1',
      permissions: ['admissions:*', 'documents:*'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/admissions/applications/00000000-0000-0000-0000-000000000701/documents',
      started_at: '2026-05-14T14:30:00.000Z',
    },
    () =>
      service.storeApplicationDocument(
        '00000000-0000-0000-0000-000000000701',
        {
          document_type: 'birth_certificate',
          uploaded_by_user_id: '00000000-0000-0000-0000-000000000001',
        },
        {
          originalname: 'birth-cert-brenda.pdf',
          mimetype: 'application/pdf',
          size: 204800,
          buffer: Buffer.from('%PDF-1.7\nadmission document'),
        },
      ),
  );

  assert.equal((captured.scannedFile as { originalname: string }).originalname, 'birth-cert-brenda.pdf');
  assert.deepEqual((captured.savedFile as { providerMalwareScan: unknown }).providerMalwareScan, {
    provider: 'webhook',
    status: 'clean',
    scannedAt: '2026-05-14T14:30:00.000Z',
    scanId: 'scan-admissions-1',
  });
});

test('AdmissionsService creates and registers a manual admission application automatically', async () => {
  let capturedAdmission: Record<string, unknown> | undefined;
  const service = new AdmissionsService(
    {
      requireStore: () => ({
        tenant_id: '00000000-0000-0000-0000-000000000123',
        user_id: '00000000-0000-0000-0000-000000000456',
        role: 'admissions-officer',
      }),
      getStore: () => ({
        tenant_id: '00000000-0000-0000-0000-000000000123',
        user_id: '00000000-0000-0000-0000-000000000456',
        role: 'admissions-officer',
      }),
    } as any,
    { withRequestTransaction: async <T>(cb: () => Promise<T>) => cb() } as any,
    {
      admitCanonicalStudent: async (input: Record<string, unknown>) => {
        capturedAdmission = input;
        return {
          application_status: 'registered',
          student: {
            id: '00000000-0000-0000-0000-000000000999',
            admission_number: 'ADM/MANUAL/001',
            first_name: 'Manual',
            last_name: 'Student',
          },
          placement: {
            academic_year_id: '00000000-0000-0000-0000-000000000111',
            class_section_id: '00000000-0000-0000-0000-000000000222',
            stream_id: '00000000-0000-0000-0000-000000000333',
            class_name: 'Form 1',
            stream_name: 'North',
            academic_enrollment_id: '00000000-0000-0000-0000-000000000444',
          },
          subject_enrollments: [{ subject_id: '00000000-0000-0000-0000-000000000555' }],
          guardian_portal: { status: 'otp_ready' },
          student_portal: { status: 'pending_first_access' },
          fee_assignment: null,
          fee_invoice: null,
        };
      },
      discardAdmissionDraft: async () => ({ discarded: true }),
    } as any,
    {} as any,
    {} as any,
  );
  const manualResult = await service.createManualAdmission({
    admission_number: ' adm/manual/001 ',
    first_name: 'Manual',
    last_name: 'Student',
    gender: 'male',
    admission_date: '2026-01-06',
    academic_year_id: '00000000-0000-0000-0000-000000000111',
    curriculum: '8-4-4',
    grade_level: 'Form 1',
    class_section_id: '00000000-0000-0000-0000-000000000222',
    stream_id: '00000000-0000-0000-0000-000000000333',
    subject_ids: ['00000000-0000-0000-0000-000000000555'],
    guardian_name: 'Manual Parent',
    guardian_phone: '0799999999',
    guardian_relationship: 'Mother',
  });

  assert.equal(manualResult.application_status, 'registered');
  assert.ok(manualResult.student.id);
  assert.equal(manualResult.student.admission_number, 'ADM/MANUAL/001');
  assert.equal(manualResult.student.first_name, 'Manual');
  assert.equal(manualResult.placement.class_name, 'Form 1');
  assert.equal(capturedAdmission?.admission_number, 'ADM/MANUAL/001');
  assert.equal(capturedAdmission?.date_of_birth, null);
  assert.equal(capturedAdmission?.guardian_phone, '+254799999999');
});

test('AdmissionsService commits admission events and dashboard notifications before success without post-commit replay', async () => {
  const published: Array<{ input: Record<string, unknown>; tx: unknown }> = [];
  const materialized: Array<{ input: Record<string, unknown>; tx: unknown }> = [];
  let legacyOperationCalled = false;
  let agpIntent: Record<string, any> | undefined;
  const tx = { id: 'admission-transaction' };
  const admitted = {
    application_id: '00000000-0000-0000-0000-000000000701',
    student: {
      id: '00000000-0000-0000-0000-000000000999',
      admission_number: 'ADM/MANUAL/002',
      first_name: 'Safe',
      middle_name: null,
      last_name: 'Retry',
    },
    placement: {
      academic_year_id: '00000000-0000-0000-0000-000000000111',
      academic_year_name: '2026',
      class_section_id: '00000000-0000-0000-0000-000000000222',
      class_name: 'Form 1',
      stream_id: '00000000-0000-0000-0000-000000000333',
      stream_name: 'North',
      academic_enrollment_id: '00000000-0000-0000-0000-000000000444',
    },
    subjects: [{ id: '00000000-0000-0000-0000-000000000555' }],
    guardian: { profile_id: '00000000-0000-0000-0000-000000000666' },
    student_portal: { username: 'ADM/MANUAL/002' },
    fees: { status: 'not_configured' },
  };
  const service = new AdmissionsService(
    {
      requireStore: () => ({
        tenant_id: '00000000-0000-0000-0000-000000000123',
        user_id: '00000000-0000-0000-0000-000000000456',
        role: 'admissions-officer',
      }),
      getStore: () => ({
        tenant_id: '00000000-0000-0000-0000-000000000123',
        user_id: '00000000-0000-0000-0000-000000000456',
        role: 'admissions-officer',
      }),
    } as any,
    {} as any,
    {
      admitCanonicalStudent: async (
        _input: Record<string, unknown>,
        persistGovernance: (input: { tx: unknown; result: typeof admitted }) => Promise<void>,
      ) => {
        await persistGovernance({ tx, result: admitted });
        return admitted;
      },
    } as any,
    {} as any,
    {} as any,
    undefined,
    {
      publish: async (input: Record<string, unknown>, transaction: unknown) => {
        published.push({ input, tx: transaction });
        return { id: `event-${published.length}` };
      },
    } as any,
    {
      execute: async (intent: Record<string, any>) => {
        agpIntent = intent;
        return intent.handler();
      },
    } as any,
    {
      recordSchoolOperation: async () => {
        legacyOperationCalled = true;
      },
    } as any,
    undefined,
    undefined,
    undefined,
    {
      upsertFromSchoolOperation: async (input: Record<string, unknown>, transaction: unknown) => {
        materialized.push({ input, tx: transaction });
      },
    } as any,
  );

  const result = await service.createManualAdmission({
    admission_number: 'ADM/MANUAL/002',
    first_name: 'Safe',
    last_name: 'Retry',
    gender: 'female',
    admission_date: '2026-01-06',
    academic_year_id: '00000000-0000-0000-0000-000000000111',
    curriculum: '8-4-4',
    grade_level: 'Form 1',
    class_section_id: '00000000-0000-0000-0000-000000000222',
    stream_id: '00000000-0000-0000-0000-000000000333',
    subject_ids: ['00000000-0000-0000-0000-000000000555'],
    guardian_name: 'Safe Parent',
    guardian_phone: '0712345678',
    guardian_relationship: 'Mother',
  });

  assert.equal(published.length, 9);
  assert.equal(published.every((event) => event.tx === tx), true);
  assert.equal(materialized.length, 2);
  assert.equal(materialized.every((notification) => notification.tx === tx), true);
  assert.equal(legacyOperationCalled, false);
  assert.equal(agpIntent?.governanceRecordedInHandler, true);
  assert.equal(agpIntent?.retrySafe, false);
  assert.equal(result.student.id, admitted.student.id);
});

test('AdmissionsService normalizes and governs admission-number changes', async () => {
  let captured: Record<string, unknown> | undefined;
  const service = new AdmissionsService(
    {
      requireStore: () => ({
        tenant_id: '00000000-0000-0000-0000-000000000123',
        user_id: '00000000-0000-0000-0000-000000000456',
        role: 'principal',
      }),
      getStore: () => ({
        tenant_id: '00000000-0000-0000-0000-000000000123',
        user_id: '00000000-0000-0000-0000-000000000456',
        role: 'principal',
      }),
    } as any,
    {} as any,
    {
      changeStudentAdmissionNumber: async (input: Record<string, unknown>) => {
        captured = input;
        return {
          student_id: input.student_id,
          previous_admission_number: 'OLD/001',
          admission_number: input.admission_number,
          changed: false,
        };
      },
    } as any,
    {} as any,
    {} as any,
  );

  const result = await service.changeStudentAdmissionNumber(
    '00000000-0000-0000-0000-000000000999',
    {
      admission_number: ' new/2026/001 ',
      reason: 'Correcting the school register identifier',
      confirmed: true,
    },
  );

  assert.equal(captured?.tenant_id, '00000000-0000-0000-0000-000000000123');
  assert.equal(captured?.actor_user_id, '00000000-0000-0000-0000-000000000456');
  assert.equal(captured?.admission_number, 'NEW/2026/001');
  assert.equal(result.admission_number, 'NEW/2026/001');
});

test('AdmissionsService normalizes guardian recovery phone changes without exposing the old phone', async () => {
  let captured: Record<string, unknown> | undefined;
  const service = new AdmissionsService(
    {
      requireStore: () => ({
        tenant_id: '00000000-0000-0000-0000-000000000123',
        user_id: '00000000-0000-0000-0000-000000000456',
        role: 'principal',
      }),
      getStore: () => ({
        tenant_id: '00000000-0000-0000-0000-000000000123',
        user_id: '00000000-0000-0000-0000-000000000456',
        role: 'principal',
      }),
    } as any,
    {} as any,
    {
      changePrimaryGuardianPhone: async (input: Record<string, unknown>) => {
        captured = input;
        return {
          student_id: input.student_id,
          guardian_profile_id: '00000000-0000-0000-0000-000000000777',
          previous_phone: '+254700000001',
          previous_phone_last4: '0001',
          phone_last4: '9999',
          affected_student_ids: [input.student_id],
          pending_otps_invalidated: true,
          changed: false,
        };
      },
    } as any,
    {} as any,
    {} as any,
  );

  const result = await service.changePrimaryGuardianPhone(
    '00000000-0000-0000-0000-000000000999',
    {
      guardian_phone: '0799 999 999',
      reason: 'Guardian supplied a replacement recovery number',
      confirmed: true,
    },
  );

  assert.equal(captured?.guardian_phone, '+254799999999');
  assert.equal(captured?.guardian_phone_last4, '9999');
  assert.equal('previous_phone' in result, false);
});

test('AdmissionsService updates document verification status', async () => {
  const requestContext = new RequestContextService();

  const service = new AdmissionsService(
    requestContext,
    {
      withRequestTransaction: async <T>(callback: () => Promise<T>): Promise<T> => callback(),
    } as never,
    {
      updateDocumentVerificationStatus: async () => ({
        id: '00000000-0000-0000-0000-000000000901',
        document_type: 'passport_photo',
        original_file_name: 'brenda-photo.jpg',
        verification_status: 'verified',
      }),
    } as never,
    {
      save: async () => {
        throw new Error('not used in this test');
      },
    } as never,
    {
      createStudent: async () => {
        throw new Error('not used in this test');
      },
    } as never,
  );

  const response = await requestContext.run(
    {
      request_id: 'req-admissions-doc-verify-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'admissions',
      session_id: 'session-1',
      permissions: ['documents:*'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'PATCH',
      path: '/admissions/documents/00000000-0000-0000-0000-000000000901',
      started_at: '2026-05-04T00:00:00.000Z',
    },
    () =>
      service.updateDocumentVerificationStatus('00000000-0000-0000-0000-000000000901', {
        verification_status: 'verified',
      }),
  );

  assert.equal(response.verification_status, 'verified');
  assert.equal(response.document_type, 'passport_photo');
});
