import assert from 'node:assert/strict';
import test from 'node:test';
import PDFDocument from 'pdfkit';

import { createReportCardPdfArtifact } from './report-card-pdf-artifact';
import { hydrateReportCardLogoForRendering } from './report-card-logo-hydration';
import { buildPersonalizedReportCardComments, ReportCardTemplateService } from './report-card-template.service';

function referencePayload() {
  return new ReportCardTemplateService().buildPayload({
    school: {
      name: 'Greenfield Academy',
      motto: 'Knowledge, Discipline, Excellence',
      address: 'P.O. Box 123, Nairobi',
      phone: '0700 123 456',
      email: 'info@greenfieldacademy.sch.ke',
    },
    student: {
      full_name: 'Amani Njoroge',
      admission_number: 'GS-2048',
      class_name: 'Grade 8',
      stream_name: 'North',
      gender: 'Male',
      class_teacher_name: 'Ms. Wanjiku',
    },
    exam_series: {
      name: 'Term 2 Assessment',
      academic_term_name: 'Term 2',
      academic_year_name: '2026',
      curriculum_model: 'CBC / 8-4-4 Ready',
      closing_date: '2026-08-12',
    },
    attendance: {
      days_present: 58,
      total_days: 60,
    },
    next_term: { opening_date: '2026-09-02' },
    comments: {
      class_teacher: 'Amani has shown strong academic growth and consistent effort.',
      principal: 'An impressive overall performance. Keep up the focus and discipline.',
      conduct_summary: 'Excellent',
    },
    grading_policy: {
      rules: [
        { min: 80, max: 100, label: 'A' },
        { min: 70, max: 79.99, label: 'B' },
        { min: 60, max: 69.99, label: 'C' },
        { min: 50, max: 59.99, label: 'D' },
        { min: 0, max: 49.99, label: 'E' },
      ],
    },
    subjects: [
      ['English', 82, 'A-', 'Exceeding Expectation'],
      ['Kiswahili', 78, 'B+', 'Meeting Expectation'],
      ['Mathematics', 85, 'A', 'Exceeding Expectation'],
      ['Integrated Science', 80, 'A-', 'Exceeding Expectation'],
      ['Social Studies', 76, 'B+', 'Meeting Expectation'],
      ['CRE', 88, 'A', 'Exceeding Expectation'],
      ['Computer Studies', 89, 'A', 'Exceeding Expectation'],
    ].map(([subject_name, score, grade_label, descriptor], index) => ({
      subject_id: `subject-${index + 1}`,
      subject_name,
      score,
      score_status: 'entered',
      max_score: 100,
      grade_label,
      descriptor,
      remarks: descriptor,
    })),
  }, '2026-08-12T09:00:00.000Z');
}

test('report-card HTML uses the approved branded information hierarchy', () => {
  const html = new ReportCardTemplateService().renderHtml(referencePayload(), 'RC-2026-0001').toString('utf8');

  assert.match(html, /My<span>Shule<\/span>/);
  assert.match(html, /Student Information/);
  assert.match(html, /Academic Performance/);
  assert.match(html, /Performance Analytics/);
  assert.match(html, /Summary Overview/);
  assert.match(html, /Class Teacher Comment/);
  assert.match(html, /Principal Signature/);
  assert.match(html, /Generated securely by MyShule School Management System/);
  assert.doesNotMatch(html, /Not recorded|History unavailable|No marks entered/i);
});

test('report-card HTML and PDF display signature images and role labels without signer names', async (t) => {
  const payload = referencePayload();
  const signature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  payload.template_fields.class_teacher_name = 'SignatureOnly Teacher';
  payload.template_fields.class_teacher_signature_ref = signature;
  payload.template_fields.principal_name = 'SignatureOnly Principal';
  payload.template_fields.principal_signature_ref = signature;

  const html = new ReportCardTemplateService().renderHtml(payload, 'RC-2026-0001').toString('utf8');
  assert.match(html, /alt="Class teacher signature"/);
  assert.match(html, /alt="Principal signature"/);
  assert.doesNotMatch(html, /SignatureOnly|signature-name/);

  const text = t.mock.method(PDFDocument.prototype, 'text');
  const pdf = await createReportCardPdfArtifact(payload, 'RC-2026-0001');
  const renderedText = text.mock.calls.map((call: { arguments: unknown[] }) => call.arguments[0]).join('\n');
  assert.doesNotMatch(renderedText, /SignatureOnly/);
  assert.match(renderedText, /Class Teacher Signature/);
  assert.match(renderedText, /Principal Signature/);
  assert.equal(pdf.content.subarray(0, 5).toString('ascii'), '%PDF-');
  assert.ok(pdf.byteLength > 4_000);
});

test('report-card PDF remains a single A4 page with all learner rows represented', async () => {
  const artifact = await createReportCardPdfArtifact(referencePayload(), 'RC-2026-0001');
  const pdfSource = artifact.content.toString('latin1');
  const pages = pdfSource.match(/\/Type\s*\/Page\b/g) ?? [];

  assert.equal(artifact.contentType, 'application/pdf');
  assert.equal(artifact.rowCount, 7);
  assert.equal(artifact.content.subarray(0, 5).toString('ascii'), '%PDF-');
  assert.equal(pages.length, 1);
  assert.ok(artifact.byteLength > 4_000);
});

for (const examName of ['End Term 1', 'Mid Term', 'End Term 3', 'CAT 1']) {
  test(`report-card HTML and PDF use four columns with the actual ${examName} name`, async (t) => {
    const payload = referencePayload();
    payload.template_fields.exam_series = examName;
    payload.exam_series.name = examName;
    payload.subjects.forEach((subject) => {
      subject.assessment_components = [{
        name: `${subject.subject_name.toUpperCase()} Main Paper`,
        weight: 100, score: subject.score, max_score: 100,
        percentage: subject.percentage ?? null, score_status: 'entered',
      }];
    });
    const before = structuredClone(payload);
    const html = new ReportCardTemplateService().renderHtml(payload, 'RC-2026-0001').toString('utf8');
    const table = html.match(/<table>[\s\S]*?<\/table>/)?.[0] ?? '';
    assert.deepEqual([...table.matchAll(/<th>(.*?)<\/th>/g)].map((match) => match[1]), [
      'Subject', examName, 'Grade', 'Achievement Level',
    ]);
    assert.equal((table.match(/<tr>/g) ?? []).length, 8);
    assert.equal((table.match(/<td>/g) ?? []).length, 28);
    assert.doesNotMatch(table, /Main Paper|Final %/);
    for (const subject of payload.subjects) {
      assert.equal(table.split(`<td>${subject.subject_name}</td>`).length - 1, 1);
      assert.ok(table.includes(`<td>${subject.subject_name}</td><td>${subject.percentage}%</td><td>${subject.grade_label}</td><td>${subject.descriptor}</td>`));
    }

    const textSpy = t.mock.method(PDFDocument.prototype, 'text');
    const artifact = await createReportCardPdfArtifact(payload, 'RC-2026-0001');
    const printed = textSpy.mock.calls.map((call: { arguments: unknown[] }) => String(call.arguments[0]));
    const academicTable = printed.slice(printed.indexOf('ACADEMIC PERFORMANCE') + 1, printed.indexOf('Average: '));
    assert.deepEqual(academicTable, [
      'Subject', examName, 'Grade', 'Achievement Level',
      ...payload.subjects.flatMap((subject) => [subject.subject_name, `${subject.percentage}%`, subject.grade_label, subject.descriptor]),
    ]);
    assert.equal((artifact.content.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length, 1);
    assert.deepEqual(payload, before, 'rendering must preserve calculations, comments, analytics and all source data');
  });
}

test('report-card generated comments give distinct, result-based next steps across performance levels', () => {
  for (const scores of [[96, 88], [86, 63], [67, 50], [42, 20], [55, 53], [90, 89], [0], [95]]) {
    const subjects = scores.map((score, index) => ({
      subject_id: `subject-${index}`, subject_name: index === 0 ? 'English' : 'Mathematics',
      score, max_score: 100, percentage: score, score_status: 'entered', grade_label: null, remarks: null,
    }));
    const comments = buildPersonalizedReportCardComments({
      student: { first_name: 'Amina' }, subjects,
      percentage: scores.reduce((total, score) => total + score, 0) / scores.length,
      termHistory: [],
    });
    assert.notEqual(comments.classTeacher, comments.principal);
    assert.notEqual(comments.classTeacher?.split('.')[0], comments.principal?.split('.')[0]);
    assert.match(comments.classTeacher ?? '', /practise|revision timetable|extension questions|challenging questions/i);
    assert.match(comments.principal ?? '', /goal/);
    assert.match(comments.principal ?? '', /review/);
    assert.match(comments.classTeacher ?? '', /English|Mathematics/);
    assert.doesNotMatch(`${comments.classTeacher} ${comments.principal}`, /promot|conduct|behavio|discipline/i);
  }
});

test('report-card preserves authored comments and identifies new automated guidance', () => {
  const payload = referencePayload();
  assert.equal(payload.template_fields.class_teacher_comment, 'Amani has shown strong academic growth and consistent effort.');
  assert.equal(payload.template_fields.principal_comment, 'An impressive overall performance. Keep up the focus and discipline.');
  assert.equal(payload.template_fields.class_teacher_comment_source, 'manual');
  assert.equal(payload.template_fields.principal_comment_source, 'manual');

  const generated = new ReportCardTemplateService().buildPayload({
    student: payload.student, exam_series: payload.exam_series, subjects: payload.subjects,
  }, payload.generated_at);
  assert.equal(generated.template_fields.class_teacher_comment_source, 'automated_performance_v2');
  assert.equal(generated.template_fields.principal_comment_source, 'automated_performance_v2');
  assert.notEqual(generated.template_fields.class_teacher_comment, generated.template_fields.principal_comment);
});

test('report-card payload uses processed results and aggregates real weighted assessment components', () => {
  const payload = new ReportCardTemplateService().buildPayload({
    school: { name: 'Tenant School' },
    student: { full_name: 'Learner One' },
    exam_series: { name: 'Term 1' },
    result_snapshot: { percentage: 81.25, grade_label: 'A-', position: 3, cohort_size: 40 },
    grading_policy: {
      boundaries: [
        { min_score: 80, max_score: 100, label: 'A-', descriptor: 'Exceeding Expectations' },
        { min_score: 0, max_score: 79.99, label: 'B', descriptor: 'Meeting Expectations' },
      ],
    },
    subjects: [
      {
        subject_id: 'mathematics',
        subject_name: 'Mathematics',
        assessment_name: 'CAT',
        assessment_weight: 30,
        score: 24,
        max_score: 30,
        percentage: 80,
        score_status: 'entered',
      },
      {
        subject_id: 'mathematics',
        subject_name: 'Mathematics',
        assessment_name: 'End-term exam',
        assessment_weight: 70,
        score: 63,
        max_score: 70,
        percentage: 90,
        score_status: 'entered',
      },
    ],
  }, '2026-08-12T09:00:00.000Z');

  assert.equal(payload.subjects.length, 1);
  assert.equal(payload.subjects[0]?.subject_name, 'Mathematics');
  assert.equal(payload.subjects[0]?.percentage, 87);
  assert.equal(payload.subjects[0]?.grade_label, 'A-');
  assert.deepEqual(payload.subjects[0]?.assessment_components?.map((component) => component.name), ['CAT', 'End-term exam']);
  assert.equal(payload.totals.percentage, 81.25);
  assert.equal(payload.totals.mean_score, 81.25);
  assert.equal(payload.totals.overall_grade, 'A-');
  assert.equal(payload.totals.class_position, '3 of 40');
  const html = new ReportCardTemplateService().renderHtml(payload, 'RC-WEIGHTED').toString('utf8');
  const table = html.match(/<table>[\s\S]*?<\/table>/)?.[0] ?? '';
  assert.equal(table.split('<td>Mathematics</td>').length - 1, 1);
  assert.ok(table.includes('<td>Mathematics</td><td>87%</td><td>A-</td><td>Exceeding Expectations</td>'));
  assert.doesNotMatch(table, /CAT|End-term exam|Final %/);
});

test('report-card renderer embeds only the current tenant uploaded school logo', async () => {
  const payload = referencePayload();
  payload.template_fields.school_logo_ref = 'tenant/tenant-a/school_logo/logo.png';
  let reads = 0;
  const hydrated = await hydrateReportCardLogoForRendering(payload, 'tenant-a', {
    readForTenant: async () => {
      reads += 1;
      return {
        stored_path: 'tenant/tenant-a/school_logo/logo.png',
        original_file_name: 'logo.png',
        mime_type: 'image/png',
        size_bytes: 3,
        sha256: 'hash',
        storage_backend: 'database',
        retention_policy: 'permanent',
        retention_expires_at: null,
        content: Buffer.from([1, 2, 3]),
      };
    },
  });

  assert.equal(reads, 1);
  assert.equal(hydrated.template_fields.school_logo_ref, 'data:image/png;base64,AQID');
  assert.equal(payload.template_fields.school_logo_ref, 'tenant/tenant-a/school_logo/logo.png');

  const crossTenant = await hydrateReportCardLogoForRendering(payload, 'tenant-b', {
    readForTenant: async () => {
      reads += 1;
      throw new Error('must not read across tenants');
    },
  });
  assert.equal(reads, 1);
  assert.equal(crossTenant.template_fields.school_logo_ref, payload.template_fields.school_logo_ref);
});

test('report-card renderer hydrates class-teacher and Principal signatures only from the current tenant', async () => {
  const payload = referencePayload();
  payload.template_fields.class_teacher_signature_ref = 'tenant/tenant-a/exams/report-card-signatures/class_teacher/teacher-a/signature.png';
  payload.template_fields.principal_signature_ref = 'tenant/tenant-a/exams/report-card-signatures/principal/principal-a/signature.jpg';
  const reads: string[] = [];
  const hydrated = await hydrateReportCardLogoForRendering(payload, 'tenant-a', {
    readForTenant: async ({ storagePath }: { tenantId: string; storagePath: string }) => {
      reads.push(storagePath);
      return {
        stored_path: storagePath,
        original_file_name: storagePath.endsWith('.jpg') ? 'signature.jpg' : 'signature.png',
        mime_type: storagePath.endsWith('.jpg') ? 'image/jpeg' : 'image/png',
        size_bytes: 3,
        sha256: 'hash',
        storage_backend: 'database',
        retention_policy: 'school-record',
        retention_expires_at: null,
        content: Buffer.from([1, 2, 3]),
      };
    },
  });

  assert.equal(reads.length, 2);
  assert.match(hydrated.template_fields.class_teacher_signature_ref ?? '', /^data:image\/png;base64,/);
  assert.match(hydrated.template_fields.principal_signature_ref ?? '', /^data:image\/jpeg;base64,/);

  let crossTenantReads = 0;
  await hydrateReportCardLogoForRendering(payload, 'tenant-b', {
    readForTenant: async () => {
      crossTenantReads += 1;
      throw new Error('must not read across tenants');
    },
  });
  assert.equal(crossTenantReads, 0);
});

test('report-card drafts include both saved signatures before submission, approval or publication', async () => {
  const payload = referencePayload();
  payload.template_fields.class_teacher_signature_ref = 'tenant/tenant-a/exams/report-card-signatures/class_teacher/teacher-a/signature.png';
  payload.template_fields.principal_signature_ref = 'tenant/tenant-a/exams/report-card-signatures/principal/principal-a/signature.png';
  const reads: string[] = [];
  const hydrated = await hydrateReportCardLogoForRendering(payload, 'tenant-a', {
    readForTenant: async ({ storagePath }: { tenantId: string; storagePath: string }) => {
      reads.push(storagePath);
      return {
        stored_path: storagePath,
        original_file_name: 'signature.png',
        mime_type: 'image/png',
        size_bytes: 3,
        sha256: 'hash',
        storage_backend: 'database',
        retention_policy: 'school-record',
        retention_expires_at: null,
        content: Buffer.from([1, 2, 3]),
      };
    },
  });

  assert.equal(reads.length, 2);
  assert.match(hydrated.template_fields.class_teacher_signature_ref ?? '', /^data:image\/png;base64,/);
  assert.match(hydrated.template_fields.principal_signature_ref ?? '', /^data:image\/png;base64,/);
  assert.equal(payload.template_fields.principal_signature_ref, 'tenant/tenant-a/exams/report-card-signatures/principal/principal-a/signature.png');
  const html = new ReportCardTemplateService().renderHtml(hydrated, 'DRAFT-SIGNED').toString('utf8');
  assert.match(html, /alt="Class teacher signature"/);
  assert.match(html, /alt="Principal signature"/);
});
