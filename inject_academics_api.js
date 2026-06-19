const fs = require('fs');
const path = require('path');

const controllerPath = path.join(__dirname, 'apps/api/src/modules/academics/academics.controller.ts');
const servicePath = path.join(__dirname, 'apps/api/src/modules/academics/academics.service.ts');
const examsControllerPath = path.join(__dirname, 'apps/api/src/modules/exams/exams.controller.ts');
const examsServicePath = path.join(__dirname, 'apps/api/src/modules/exams/exams.service.ts');

const academicControllerMethods = `
  // --- Departments & HODs ---
  @Post('departments')
  @Permissions('academics:write')
  createDepartment(@Body() dto: any) {
    return this.academicsService.createDepartment(dto);
  }

  @Get('departments')
  @Permissions('academics:read')
  listDepartments() {
    return this.academicsService.listDepartments();
  }

  @Post('departments/hod-assignments')
  @Permissions('academics:write')
  assignHOD(@Body() dto: any) {
    return this.academicsService.assignHOD(dto);
  }

  // --- CBC Academic Setup ---
  @Post('learning-areas')
  @Permissions('academics:write')
  createLearningArea(@Body() dto: any) {
    return this.academicsService.createLearningArea(dto);
  }

  @Get('learning-areas')
  @Permissions('academics:read')
  listLearningAreas() {
    return this.academicsService.listLearningAreas();
  }

  @Post('strands')
  @Permissions('academics:write')
  createStrand(@Body() dto: any) {
    return this.academicsService.createStrand(dto);
  }

  @Post('sub-strands')
  @Permissions('academics:write')
  createSubStrand(@Body() dto: any) {
    return this.academicsService.createSubStrand(dto);
  }
`;

const academicServiceMethods = `
  // --- Departments & HODs ---
  async createDepartment(dto: any) {
    const store = (this as any).requestContext?.getStore();
    const schoolId = store?.schoolId;
    if (!schoolId) throw new Error('No school context');

    return this.prisma.department.create({
      data: {
        schoolId,
        name: dto.name,
        code: dto.code || dto.name.substring(0, 3).toUpperCase(),
        curriculumScope: dto.curriculumScope || 'BOTH',
      },
    });
  }

  async listDepartments() {
    const store = (this as any).requestContext?.getStore();
    const schoolId = store?.schoolId;
    if (!schoolId) throw new Error('No school context');

    return this.prisma.department.findMany({
      where: { schoolId },
      include: { hodAssignments: true, subjects: true }
    });
  }

  async assignHOD(dto: any) {
    const store = (this as any).requestContext?.getStore();
    const schoolId = store?.schoolId;
    if (!schoolId) throw new Error('No school context');

    // Archive previous active assignments
    await this.prisma.hODAssignment.updateMany({
      where: { departmentId: dto.departmentId, isActive: true },
      data: { isActive: false, endDate: new Date() }
    });

    return this.prisma.hODAssignment.create({
      data: {
        schoolId,
        departmentId: dto.departmentId,
        teacherUserId: dto.teacherUserId,
        academicYearId: dto.academicYearId,
        scope: dto.scope || 'BOTH',
      }
    });
  }

  // --- CBC Academic Setup ---
  async createLearningArea(dto: any) {
    const store = (this as any).requestContext?.getStore();
    const schoolId = store?.schoolId;
    if (!schoolId) throw new Error('No school context');

    return this.prisma.learningArea.create({
      data: {
        schoolId,
        name: dto.name,
        code: dto.code || dto.name.substring(0, 3).toUpperCase(),
        departmentId: dto.departmentId,
      }
    });
  }

  async listLearningAreas() {
    const store = (this as any).requestContext?.getStore();
    const schoolId = store?.schoolId;
    if (!schoolId) throw new Error('No school context');

    return this.prisma.learningArea.findMany({
      where: { schoolId },
      include: { strands: { include: { subStrands: true } } }
    });
  }

  async createStrand(dto: any) {
    const store = (this as any).requestContext?.getStore();
    const schoolId = store?.schoolId;
    if (!schoolId) throw new Error('No school context');

    return this.prisma.strand.create({
      data: { schoolId, learningAreaId: dto.learningAreaId, name: dto.name, description: dto.description }
    });
  }

  async createSubStrand(dto: any) {
    const store = (this as any).requestContext?.getStore();
    const schoolId = store?.schoolId;
    if (!schoolId) throw new Error('No school context');

    return this.prisma.subStrand.create({
      data: { schoolId, strandId: dto.strandId, name: dto.name, description: dto.description }
    });
  }
`;

const examsControllerMethods = `
  // --- CBC Assessment & Mark Workflow ---
  @Post('cbc-assessment')
  @Permissions('academics:write')
  enterCBCAssessment(@Body() dto: any) {
    return this.examsService.enterCBCAssessment(dto);
  }

  @Post('mark-submissions')
  @Permissions('academics:write')
  submitMarks(@Body() dto: any) {
    return this.examsService.submitMarks(dto);
  }

  @Post('hod-reviews')
  @Permissions('academics:write') // Should be specific to HOD
  reviewMarks(@Body() dto: any) {
    return this.examsService.reviewMarks(dto);
  }

  @Post('readiness-checks')
  @Permissions('academics:write') // Should be Admin/Dean
  checkExamReadiness(@Body() dto: any) {
    return this.examsService.checkExamReadiness(dto);
  }
`;

const examsServiceMethods = `
  // --- CBC Assessment & Mark Workflow ---
  async enterCBCAssessment(dto: any) {
    const store = (this as any).requestContext?.getStore();
    const schoolId = store?.schoolId;
    if (!schoolId) throw new Error('No school context');

    return this.prisma.cBCAssessmentEntry.create({
      data: {
        schoolId,
        examCycleId: dto.examCycleId,
        studentId: dto.studentId,
        classId: dto.classId,
        streamId: dto.streamId,
        strandId: dto.strandId,
        subStrandId: dto.subStrandId,
        teacherUserId: dto.teacherUserId,
        level: dto.level,
        descriptor: dto.descriptor,
        comment: dto.comment,
        status: 'DRAFT',
      }
    });
  }

  async submitMarks(dto: any) {
    const store = (this as any).requestContext?.getStore();
    const schoolId = store?.schoolId;
    if (!schoolId) throw new Error('No school context');

    // Ensure teacher has assignment before submitting
    const assignment = await this.prisma.teacherSubjectAssignment.findFirst({
      where: { schoolId, teacherUserId: dto.teacherUserId, subjectId: dto.subjectId }
    });
    if (!assignment) throw new Error('Not authorized to submit marks for this subject');

    // Update draft marks
    await this.prisma.marksEntry.updateMany({
      where: { schoolId, examCycleId: dto.examCycleId, subjectId: dto.subjectId, teacherUserId: dto.teacherUserId },
      data: { status: 'SUBMITTED' }
    });

    return this.prisma.markSubmission.create({
      data: {
        schoolId,
        examCycleId: dto.examCycleId,
        subjectId: dto.subjectId,
        teacherUserId: dto.teacherUserId,
        status: 'SUBMITTED',
      }
    });
  }

  async reviewMarks(dto: any) {
    const store = (this as any).requestContext?.getStore();
    const schoolId = store?.schoolId;
    if (!schoolId) throw new Error('No school context');

    const submission = await this.prisma.markSubmission.findUnique({ where: { id: dto.markSubmissionId } });
    if (!submission) throw new Error('Submission not found');

    const newStatus = dto.approved ? 'APPROVED' : 'RETURNED';

    await this.prisma.markSubmission.update({
      where: { id: dto.markSubmissionId },
      data: { status: newStatus }
    });

    if (submission.subjectId) {
       await this.prisma.marksEntry.updateMany({
        where: { schoolId, examCycleId: submission.examCycleId, subjectId: submission.subjectId },
        data: { status: newStatus }
      });
    }

    return this.prisma.hODReview.create({
      data: {
        schoolId,
        markSubmissionId: dto.markSubmissionId,
        hodUserId: dto.hodUserId,
        status: newStatus,
        reason: dto.reason,
      }
    });
  }

  async checkExamReadiness(dto: any) {
    const store = (this as any).requestContext?.getStore();
    const schoolId = store?.schoolId;
    if (!schoolId) throw new Error('No school context');

    // Mock readiness logic
    const submissions = await this.prisma.markSubmission.findMany({
      where: { schoolId, examCycleId: dto.examCycleId }
    });
    
    const unapproved = submissions.filter((s: any) => s.status !== 'APPROVED');
    const isReady = unapproved.length === 0;

    return this.prisma.examReadinessCheck.create({
      data: {
        schoolId,
        examCycleId: dto.examCycleId,
        checkedByUserId: dto.checkedByUserId,
        isReady,
        details: isReady ? 'All marks approved' : 'Pending HOD approvals',
      }
    });
  }
`;

function inject(filePath, methods) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('createDepartment') || content.includes('enterCBCAssessment')) {
    console.log(filePath + ' already injected');
    return;
  }
  const lastBraceIndex = content.lastIndexOf('}');
  if (lastBraceIndex !== -1) {
    content = content.substring(0, lastBraceIndex) + methods + content.substring(lastBraceIndex);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Injected into ' + filePath);
  }
}

inject(controllerPath, academicControllerMethods);
inject(servicePath, academicServiceMethods);

if (fs.existsSync(examsControllerPath) && fs.existsSync(examsServicePath)) {
  inject(examsControllerPath, examsControllerMethods);
  inject(examsServicePath, examsServiceMethods);
} else {
  console.log('Exams module files not found.');
}
