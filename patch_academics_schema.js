const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');

// 1. Add enums if they don't exist
const enumsToAdd = `
enum AssessmentResponsibility {
  MAIN_TEACHER
  ASSISTANT_TEACHER
  SUBSTITUTE
}

enum DepartmentScope {
  CBC
  EIGHT_FOUR_FOUR
  BOTH
}

enum CBCAssessmentLevel {
  EXCEEDING_EXPECTATION
  MEETING_EXPECTATION
  APPROACHING_EXPECTATION
  BELOW_EXPECTATION
}
`;

if (!schemaContent.includes('enum AssessmentResponsibility')) {
  schemaContent = schemaContent.replace('enum MarksEntryStatus {', enumsToAdd + '\n\nenum MarksEntryStatus {');
}

// 2. Update TeacherSubjectAssignment
const teacherSubjectAssignmentOriginal = `model TeacherSubjectAssignment {
  id               String                  @id @default(uuid())
  schoolId         String                  @map("school_id")
  school           School                  @relation(fields: [schoolId], references: [id])
  teacherUserId    String                  @map("teacher_user_id")
  academicYearId   String                  @map("academic_year_id")
  academicYear     AcademicYear            @relation(fields: [academicYearId], references: [id])
  termId           String?                 @map("term_id")
  term             Term?                   @relation(fields: [termId], references: [id])
  classId          String                  @map("class_id")
  class            Class                   @relation(fields: [classId], references: [id])
  streamId         String?                 @map("stream_id")
  stream           Stream?                 @relation(fields: [streamId], references: [id])
  subjectId        String                  @map("subject_id")
  subject          Subject                 @relation(fields: [subjectId], references: [id])
  assignedByUserId String                  @map("assigned_by_user_id")
  status           TeacherAssignmentStatus
  createdAt        DateTime                @default(now()) @map("created_at")
  updatedAt        DateTime                @updatedAt @map("updated_at")
  deletedAt        DateTime?               @map("deleted_at")`;

const teacherSubjectAssignmentUpdated = `model TeacherSubjectAssignment {
  id               String                  @id @default(uuid())
  schoolId         String                  @map("school_id")
  school           School                  @relation(fields: [schoolId], references: [id])
  teacherUserId    String                  @map("teacher_user_id")
  academicYearId   String                  @map("academic_year_id")
  academicYear     AcademicYear            @relation(fields: [academicYearId], references: [id])
  termId           String?                 @map("term_id")
  term             Term?                   @relation(fields: [termId], references: [id])
  classId          String                  @map("class_id")
  class            Class                   @relation(fields: [classId], references: [id])
  streamId         String?                 @map("stream_id")
  stream           Stream?                 @relation(fields: [streamId], references: [id])
  subjectId        String                  @map("subject_id")
  subject          Subject                 @relation(fields: [subjectId], references: [id])
  assignedByUserId String                  @map("assigned_by_user_id")
  status           TeacherAssignmentStatus
  
  // Added fields
  curriculumType           CurriculumType           @default(EIGHT_FOUR_FOUR) @map("curriculum_type")
  assessmentResponsibility AssessmentResponsibility @default(MAIN_TEACHER) @map("assessment_responsibility")
  canEnterMarks            Boolean                  @default(true) @map("can_enter_marks")
  canSubmitMarks           Boolean                  @default(true) @map("can_submit_marks")
  
  createdAt        DateTime                @default(now()) @map("created_at")
  updatedAt        DateTime                @updatedAt @map("updated_at")
  deletedAt        DateTime?               @map("deleted_at")`;

if (schemaContent.includes(teacherSubjectAssignmentOriginal)) {
  schemaContent = schemaContent.replace(teacherSubjectAssignmentOriginal, teacherSubjectAssignmentUpdated);
}

// 3. Update Department
const departmentOriginal = `model Department {
  id        String    @id @default(uuid())
  schoolId  String    @map("school_id")
  school    School    @relation(fields: [schoolId], references: [id])
  name      String
  code      String
  hodUserId String?   @map("hod_user_id")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")
  subjects  Subject[]`;

const departmentUpdated = `model Department {
  id        String    @id @default(uuid())
  schoolId  String    @map("school_id")
  school    School    @relation(fields: [schoolId], references: [id])
  name      String
  code      String
  hodUserId String?   @map("hod_user_id")
  
  // Added fields
  curriculumScope DepartmentScope @default(BOTH) @map("curriculum_scope")
  isActive        Boolean         @default(true) @map("is_active")
  
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")
  subjects  Subject[]
  hodAssignments HODAssignment[]`;

if (schemaContent.includes(departmentOriginal)) {
  schemaContent = schemaContent.replace(departmentOriginal, departmentUpdated);
}

// 4. Append new models (Skipping AcademicAuditLog since it already exists)
const newModels = `
// ==========================================
// Academic Engine: HOD, CBC, Workflow
// ==========================================

model HODAssignment {
  id             String    @id @default(uuid())
  schoolId       String    @map("school_id")
  school         School    @relation(fields: [schoolId], references: [id])
  departmentId   String    @map("department_id")
  department     Department @relation(fields: [departmentId], references: [id])
  teacherUserId  String    @map("teacher_user_id")
  academicYearId String    @map("academic_year_id")
  academicYear   AcademicYear @relation(fields: [academicYearId], references: [id])
  startDate      DateTime  @default(now()) @map("start_date")
  endDate        DateTime? @map("end_date")
  scope          DepartmentScope @default(BOTH)
  isActive       Boolean   @default(true) @map("is_active")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")
  deletedAt      DateTime? @map("deleted_at")

  @@index([schoolId])
  @@index([schoolId, teacherUserId])
  @@index([schoolId, departmentId])
  @@map("hod_assignments")
}

model LearningArea {
  id             String    @id @default(uuid())
  schoolId       String    @map("school_id")
  school         School    @relation(fields: [schoolId], references: [id])
  name           String
  code           String
  departmentId   String?   @map("department_id")
  isCompulsory   Boolean   @default(false) @map("is_compulsory")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")
  deletedAt      DateTime? @map("deleted_at")
  strands        Strand[]

  @@index([schoolId])
  @@map("learning_areas")
}

model Strand {
  id             String    @id @default(uuid())
  schoolId       String    @map("school_id")
  school         School    @relation(fields: [schoolId], references: [id])
  learningAreaId String    @map("learning_area_id")
  learningArea   LearningArea @relation(fields: [learningAreaId], references: [id])
  name           String
  description    String?
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")
  deletedAt      DateTime? @map("deleted_at")
  subStrands     SubStrand[]
  cbcEntries     CBCAssessmentEntry[]

  @@index([schoolId])
  @@map("strands")
}

model SubStrand {
  id             String    @id @default(uuid())
  schoolId       String    @map("school_id")
  school         School    @relation(fields: [schoolId], references: [id])
  strandId       String    @map("strand_id")
  strand         Strand    @relation(fields: [strandId], references: [id])
  name           String
  description    String?
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")
  deletedAt      DateTime? @map("deleted_at")
  cbcEntries     CBCAssessmentEntry[]

  @@index([schoolId])
  @@map("sub_strands")
}

model CBCAssessmentEntry {
  id             String    @id @default(uuid())
  schoolId       String    @map("school_id")
  school         School    @relation(fields: [schoolId], references: [id])
  examCycleId    String    @map("exam_cycle_id")
  examCycle      ExamCycle @relation(fields: [examCycleId], references: [id])
  studentId      String    @map("student_id")
  student        Student   @relation(fields: [studentId], references: [id])
  classId        String    @map("class_id")
  class          Class     @relation(fields: [classId], references: [id])
  streamId       String?   @map("stream_id")
  stream         Stream?   @relation(fields: [streamId], references: [id])
  strandId       String    @map("strand_id")
  strand         Strand    @relation(fields: [strandId], references: [id])
  subStrandId    String?   @map("sub_strand_id")
  subStrand      SubStrand? @relation(fields: [subStrandId], references: [id])
  teacherUserId  String    @map("teacher_user_id")
  level          CBCAssessmentLevel
  descriptor     String?
  comment        String?
  status         MarksEntryStatus @default(DRAFT)
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")
  deletedAt      DateTime? @map("deleted_at")

  @@index([schoolId])
  @@index([schoolId, examCycleId])
  @@index([schoolId, studentId])
  @@map("cbc_assessment_entries")
}

model MarkSubmission {
  id             String    @id @default(uuid())
  schoolId       String    @map("school_id")
  school         School    @relation(fields: [schoolId], references: [id])
  examCycleId    String    @map("exam_cycle_id")
  examCycle      ExamCycle @relation(fields: [examCycleId], references: [id])
  subjectId      String?   @map("subject_id") // For 8-4-4
  teacherUserId  String    @map("teacher_user_id")
  status         MarksEntryStatus @default(SUBMITTED)
  submittedAt    DateTime  @default(now()) @map("submitted_at")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")
  hodReviews     HODReview[]

  @@index([schoolId])
  @@map("mark_submissions")
}

model HODReview {
  id               String    @id @default(uuid())
  schoolId         String    @map("school_id")
  school           School    @relation(fields: [schoolId], references: [id])
  markSubmissionId String    @map("mark_submission_id")
  markSubmission   MarkSubmission @relation(fields: [markSubmissionId], references: [id])
  hodUserId        String    @map("hod_user_id")
  status           MarksEntryStatus
  reason           String?
  reviewedAt       DateTime  @default(now()) @map("reviewed_at")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  @@index([schoolId])
  @@map("hod_reviews")
}

model ExamReadinessCheck {
  id             String    @id @default(uuid())
  schoolId       String    @map("school_id")
  school         School    @relation(fields: [schoolId], references: [id])
  examCycleId    String    @map("exam_cycle_id")
  examCycle      ExamCycle @relation(fields: [examCycleId], references: [id])
  isReady        Boolean   @default(false) @map("is_ready")
  details        String?   @db.Text
  checkedByUserId String   @map("checked_by_user_id")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  @@index([schoolId])
  @@map("exam_readiness_checks")
}
`;

if (!schemaContent.includes('model HODAssignment')) {
  schemaContent += '\n' + newModels;
}

// 5. Update MarksEntry to include status
const marksEntryOriginal = `model MarksEntry {
  id            String           @id @default(uuid())
  schoolId      String           @map("school_id")
  school        School           @relation(fields: [schoolId], references: [id])
  examCycleId   String           @map("exam_cycle_id")
  examCycle     ExamCycle        @relation(fields: [examCycleId], references: [id])
  studentId     String           @map("student_id")
  student       Student          @relation(fields: [studentId], references: [id])
  classId       String           @map("class_id")
  class         Class            @relation(fields: [classId], references: [id])
  streamId      String           @map("stream_id")
  stream        Stream           @relation(fields: [streamId], references: [id])
  subjectId     String           @map("subject_id")
  subject       Subject          @relation(fields: [subjectId], references: [id])
  teacherUserId String           @map("teacher_user_id")
  marksObtained Float            @map("marks_obtained")
  grade         String?
  points        Float?
  comment       String?
  status        MarksEntryStatus
  createdAt     DateTime         @default(now()) @map("created_at")`;

const marksEntryUpdated = `model MarksEntry {
  id            String           @id @default(uuid())
  schoolId      String           @map("school_id")
  school        School           @relation(fields: [schoolId], references: [id])
  examCycleId   String           @map("exam_cycle_id")
  examCycle     ExamCycle        @relation(fields: [examCycleId], references: [id])
  studentId     String           @map("student_id")
  student       Student          @relation(fields: [studentId], references: [id])
  classId       String           @map("class_id")
  class         Class            @relation(fields: [classId], references: [id])
  streamId      String           @map("stream_id")
  stream        Stream           @relation(fields: [streamId], references: [id])
  subjectId     String           @map("subject_id")
  subject       Subject          @relation(fields: [subjectId], references: [id])
  teacherUserId String           @map("teacher_user_id")
  marksObtained Float            @map("marks_obtained")
  grade         String?
  points        Float?
  comment       String?
  status        MarksEntryStatus @default(DRAFT)
  createdAt     DateTime         @default(now()) @map("created_at")`;

if (schemaContent.includes(marksEntryOriginal)) {
  schemaContent = schemaContent.replace(marksEntryOriginal, marksEntryUpdated);
}

fs.writeFileSync(schemaPath, schemaContent, 'utf8');
console.log('Schema patched successfully.');
