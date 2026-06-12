const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// 1. Add missing models to the end
const newModels = `
// ---------------------------------------------------------
// Academics Phase 5 Models
// ---------------------------------------------------------

model AcademicLevel {
  id              String         @id @default(uuid())
  schoolId        String         @map("school_id")
  school          School         @relation("SchoolToAcademicLevel", fields: [schoolId], references: [id], onDelete: Cascade)
  systemType      String         @map("system_type")
  name            String
  orderIndex      Int            @map("order_index")
  isActive        Boolean        @default(true) @map("is_active")
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")
  auditLogRef     String?        @map("audit_log_reference") @db.Uuid
  
  classes         Class[]

  @@unique([schoolId, id])
  @@unique([schoolId, orderIndex])
  @@index([schoolId, orderIndex])
  @@map("academic_levels")
}

model StudentClassAssignment {
  id              String         @id @default(uuid())
  schoolId        String         @map("school_id")
  school          School         @relation("SchoolToStudentClassAssignment", fields: [schoolId], references: [id], onDelete: Cascade)
  studentId       String         @map("student_id")
  student         Student        @relation("StudentToStudentClassAssignment", fields: [studentId], references: [id], onDelete: Cascade)
  classId         String         @map("class_section_id")
  class           Class          @relation(fields: [classId], references: [id], onDelete: Cascade)
  streamId        String?        @map("stream_id")
  stream          Stream?        @relation(fields: [streamId], references: [id], onDelete: SetNull)
  academicLevelId String         @map("academic_level_id")
  academicLevel   AcademicLevel  @relation(fields: [academicLevelId], references: [id], onDelete: Cascade)
  academicYearId  String         @map("academic_year_id")
  academicYear    AcademicYear   @relation("AcademicYearToStudentClassAssignment", fields: [academicYearId], references: [id], onDelete: Cascade)
  status          String         @default("active")
  assignedBy      String?        @map("assigned_by_user_id") @db.Uuid
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")
  auditLogRef     String?        @map("audit_log_reference") @db.Uuid

  @@unique([schoolId, id])
  @@map("student_class_assignments")
}

model ReportCardComment {
  id              String         @id @default(uuid())
  schoolId        String         @map("school_id")
  school          School         @relation("SchoolToReportCardComment", fields: [schoolId], references: [id], onDelete: Cascade)
  studentId       String         @map("student_id")
  student         Student        @relation("StudentToReportCardComment", fields: [studentId], references: [id], onDelete: Cascade)
  termId          String         @map("academic_term_id")
  term            Term           @relation("TermToReportCardComment", fields: [termId], references: [id], onDelete: Cascade)
  classId         String         @map("class_section_id")
  class           Class          @relation("ClassToReportCardComment", fields: [classId], references: [id], onDelete: Cascade)
  academicComment String?        @map("academic_comment")
  behaviorComment String?        @map("behaviour_comment")
  attendanceComment String?      @map("attendance_comment")
  improvementAdvice String?      @map("improvement_advice")
  finalComment    String         @map("final_comment")
  status          String         @default("draft") @map("comment_status")
  createdBy       String?        @map("created_by_user_id") @db.Uuid
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  @@unique([schoolId, id])
  @@index([schoolId, termId, classId])
  @@map("report_card_comments")
}

model StudentNote {
  id              String         @id @default(uuid())
  schoolId        String         @map("school_id")
  school          School         @relation("SchoolToStudentNote", fields: [schoolId], references: [id], onDelete: Cascade)
  studentId       String         @map("student_id")
  student         Student        @relation("StudentToStudentNote", fields: [studentId], references: [id], onDelete: Cascade)
  noteType        String         @map("note_type")
  visibility      String         @default("private")
  description     String
  followUpDate    DateTime?      @map("follow_up_date") @db.Date
  createdBy       String?        @map("created_by_user_id") @db.Uuid
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  @@unique([schoolId, id])
  @@map("student_notes")
}

model ParentMeeting {
  id              String         @id @default(uuid())
  schoolId        String         @map("school_id")
  school          School         @relation("SchoolToParentMeeting", fields: [schoolId], references: [id], onDelete: Cascade)
  studentId       String         @map("student_id")
  student         Student        @relation("StudentToParentMeeting", fields: [studentId], references: [id], onDelete: Cascade)
  guardianId      String?        @map("guardian_id")
  reason          String
  meetingType     String         @map("meeting_type")
  meetingDate     DateTime       @map("meeting_date") @db.Date
  startTime       String         @map("start_time")
  endTime         String         @map("end_time")
  location        String?
  status          String         @default("scheduled")
  notes           String?
  createdBy       String?        @map("created_by_user_id") @db.Uuid
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  @@unique([schoolId, id])
  @@map("parent_meetings")
}

model ClassRequest {
  id              String         @id @default(uuid())
  schoolId        String         @map("school_id")
  school          School         @relation("SchoolToClassRequest", fields: [schoolId], references: [id], onDelete: Cascade)
  studentId       String?        @map("student_id")
  student         Student?       @relation("StudentToClassRequest", fields: [studentId], references: [id], onDelete: Cascade)
  requestType     String         @map("request_type")
  description     String
  priority        String         @default("medium")
  targetRole      String         @map("target_role")
  status          String         @default("submitted")
  createdBy       String?        @map("created_by_user_id") @db.Uuid
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  @@unique([schoolId, id])
  @@map("class_requests")
}

model AcademicAuditLog {
  id              String         @id @default(uuid())
  schoolId        String         @map("school_id")
  school          School         @relation("SchoolToAcademicAuditLog", fields: [schoolId], references: [id], onDelete: Cascade)
  entityType      String         @map("entity_type")
  entityId        String?        @map("entity_id") @db.Uuid
  action          String
  actorUserId     String?        @map("actor_user_id") @db.Uuid
  metadata        Json           @default("{}")
  createdAt       DateTime       @default(now()) @map("created_at")

  @@map("academic_audit_logs")
}

model AcademicGradingSystem {
  id              String         @id @default(uuid())
  schoolId        String         @map("school_id")
  school          School         @relation("SchoolToAcademicGradingSystem", fields: [schoolId], references: [id], onDelete: Cascade)
  name            String
  description     String?
  isActive        Boolean        @default(true) @map("is_active")
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  @@unique([schoolId, name])
  @@map("academics_grading_systems")
}

model AcademicAttendanceSetting {
  id              String         @id @default(uuid())
  schoolId        String         @map("school_id")
  school          School         @relation("SchoolToAcademicAttendanceSetting", fields: [schoolId], references: [id], onDelete: Cascade)
  name            String
  description     String?
  isActive        Boolean        @default(true) @map("is_active")
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  @@unique([schoolId, name])
  @@map("academics_attendance_settings")
}

model AcademicAssignment {
  id              String         @id @default(uuid())
  schoolId        String         @map("school_id")
  school          School         @relation("SchoolToAcademicAssignment", fields: [schoolId], references: [id], onDelete: Cascade)
  title           String
  description     String?
  dueDate         DateTime?      @map("due_date")
  classId         String?        @map("class_section_id")
  class           Class?         @relation("ClassToAcademicAssignment", fields: [classId], references: [id])
  createdBy       String?        @map("created_by_user_id") @db.Uuid
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  @@map("academics_assignments")
}

model AcademicResource {
  id              String         @id @default(uuid())
  schoolId        String         @map("school_id")
  school          School         @relation("SchoolToAcademicResource", fields: [schoolId], references: [id], onDelete: Cascade)
  title           String
  url             String?
  classId         String?        @map("class_section_id")
  class           Class?         @relation("ClassToAcademicResource", fields: [classId], references: [id])
  createdBy       String?        @map("created_by_user_id") @db.Uuid
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  @@map("academics_resources")
}

model LessonLog {
  id              String         @id @default(uuid())
  schoolId        String         @map("school_id")
  school          School         @relation("SchoolToLessonLog", fields: [schoolId], references: [id], onDelete: Cascade)
  title           String
  content         String?
  classId         String?        @map("class_section_id")
  class           Class?         @relation("ClassToLessonLog", fields: [classId], references: [id])
  createdBy       String?        @map("created_by_user_id") @db.Uuid
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  @@map("academics_lesson_logs")
}

model ClassTeacherAssignment {
  id              String         @id @default(uuid())
  schoolId        String         @map("school_id")
  school          School         @relation("SchoolToClassTeacherAssignment", fields: [schoolId], references: [id], onDelete: Cascade)
  academicYearId  String         @map("academic_year_id")
  academicYear    AcademicYear   @relation("AcademicYearToClassTeacherAssignment", fields: [academicYearId], references: [id], onDelete: Cascade)
  classId         String         @map("class_section_id")
  class           Class          @relation("ClassToClassTeacherAssignment", fields: [classId], references: [id], onDelete: Cascade)
  teacherUserId   String         @map("teacher_user_id") @db.Uuid
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  @@map("academics_class_teachers")
}

model ReportCardSetting {
  id              String         @id @default(uuid())
  schoolId        String         @map("school_id")
  school          School         @relation("SchoolToReportCardSetting", fields: [schoolId], references: [id], onDelete: Cascade)
  name            String
  gradingSystemId String?        @map("grading_system_id") @db.Uuid
  showRank        Boolean        @default(false) @map("show_rank")
  showAttendance  Boolean        @default(false) @map("show_attendance")
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  @@map("academics_report_card_settings")
}
`;

if (!schema.includes('model AcademicLevel {')) {
  schema += newModels;
}

// 2. Add inverse relations to School
const schoolRelations = `
  academicLevels            AcademicLevel[]            @relation("SchoolToAcademicLevel")
  studentClassAssignments   StudentClassAssignment[]   @relation("SchoolToStudentClassAssignment")
  reportCardComments        ReportCardComment[]        @relation("SchoolToReportCardComment")
  studentNotes              StudentNote[]              @relation("SchoolToStudentNote")
  parentMeetings            ParentMeeting[]            @relation("SchoolToParentMeeting")
  classRequests             ClassRequest[]             @relation("SchoolToClassRequest")
  academicAuditLogs         AcademicAuditLog[]         @relation("SchoolToAcademicAuditLog")
  academicGradingSystems    AcademicGradingSystem[]    @relation("SchoolToAcademicGradingSystem")
  academicAttendanceSettings AcademicAttendanceSetting[] @relation("SchoolToAcademicAttendanceSetting")
  academicAssignments       AcademicAssignment[]       @relation("SchoolToAcademicAssignment")
  academicResources         AcademicResource[]         @relation("SchoolToAcademicResource")
  lessonLogs                LessonLog[]                @relation("SchoolToLessonLog")
  classTeacherAssignments   ClassTeacherAssignment[]   @relation("SchoolToClassTeacherAssignment")
  reportCardSettings        ReportCardSetting[]        @relation("SchoolToReportCardSetting")
`;
if (!schema.includes('academicLevels            AcademicLevel[]')) {
  schema = schema.replace(
    /(model School \{[\s\S]*?)(  @@map\("schools"\)\n\})/g,
    `$1${schoolRelations}\n$2`
  );
}

// 3. Add inverse relations to Student
const studentRelations = `
  studentClassAssignments StudentClassAssignment[] @relation("StudentToStudentClassAssignment")
  reportCardComments      ReportCardComment[]      @relation("StudentToReportCardComment")
  studentNotes            StudentNote[]            @relation("StudentToStudentNote")
  parentMeetings          ParentMeeting[]          @relation("StudentToParentMeeting")
  classRequests           ClassRequest[]           @relation("StudentToClassRequest")
`;
if (!schema.includes('studentClassAssignments StudentClassAssignment[]')) {
  schema = schema.replace(
    /(model Student \{[\s\S]*?)(  @@map\("students"\)\n\})/g,
    `$1${studentRelations}\n$2`
  );
}

// 4. Add inverse relations to Class (ClassSection)
const classRelations = `
  studentClassAssignments StudentClassAssignment[]
  reportCardComments      ReportCardComment[]      @relation("ClassToReportCardComment")
  academicAssignments     AcademicAssignment[]     @relation("ClassToAcademicAssignment")
  academicResources       AcademicResource[]       @relation("ClassToAcademicResource")
  lessonLogs              LessonLog[]              @relation("ClassToLessonLog")
  classTeacherAssignments ClassTeacherAssignment[] @relation("ClassToClassTeacherAssignment")
`;
if (!schema.includes('reportCardComments      ReportCardComment[]      @relation("ClassToReportCardComment")')) {
  schema = schema.replace(
    /(model Class \{[\s\S]*?)(  @@map\("class_sections"\)\n\})/g,
    `$1${classRelations}\n$2`
  );
}

// 5. Add inverse relations to Stream
const streamRelations = `
  studentClassAssignments StudentClassAssignment[]
`;
if (!schema.includes('studentClassAssignments StudentClassAssignment[]')) {
  schema = schema.replace(
    /(model Stream \{[\s\S]*?)(  @@map\("class_streams"\)\n\})/g,
    `$1${streamRelations}\n$2`
  );
}

// 6. Add AcademicLevelId to Class
if (!schema.includes('academicLevelId')) {
  schema = schema.replace(
    /(model Class \{[\s\S]*?)(  @@map\("class_sections"\)\n\})/g,
    `$1  academicLevelId String? @map("academic_level_id")
  academicLevel   AcademicLevel? @relation(fields: [academicLevelId], references: [id])\n$2`
  );
}

// 7. Add inverse relations to AcademicYear
if (!schema.includes('classTeacherAssignments ClassTeacherAssignment[]')) {
  schema = schema.replace(
    /(model AcademicYear \{[\s\S]*?)(  @@map\("academic_years"\)\n\})/g,
    `$1  classTeacherAssignments ClassTeacherAssignment[] @relation("AcademicYearToClassTeacherAssignment")
  studentClassAssignments StudentClassAssignment[] @relation("AcademicYearToStudentClassAssignment")\n$2`
  );
}

// 8. Add inverse relations to Term
if (!schema.includes('reportCardComments ReportCardComment[]')) {
  schema = schema.replace(
    /(model Term \{[\s\S]*?)(  @@map\("academic_terms"\)\n\})/g,
    `$1  reportCardComments ReportCardComment[] @relation("TermToReportCardComment")\n$2`
  );
}

fs.writeFileSync(schemaPath, schema);
console.log('Schema updated successfully.');
