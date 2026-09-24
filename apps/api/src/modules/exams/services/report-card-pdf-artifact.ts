import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdtemp, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { setImmediate as yieldToEventLoop, setTimeout as waitForWriter } from 'node:timers/promises';
import PDFDocument from 'pdfkit';
import { normalizeReportGeneratedAt, type ReportArtifact } from '../../../common/reports/report-artifact';
import type {
  ReportCardPayload,
  ReportCardSubjectPayload,
} from './report-card-template.service';

const NAVY = '#08265f';
const GOLD = '#f2a900';
const INK = '#172033';
const MUTED = '#607087';
const LINE = '#d7e0ec';
const SOFT = '#f4f8fc';
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 22;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

export async function createReportCardPdfArtifact(
  payload: ReportCardPayload,
  verificationCode: string,
): Promise<ReportArtifact> {
  const generatedAt = normalizeReportGeneratedAt(payload.generated_at);
  const content = await renderReportCardPdf(payload, verificationCode, generatedAt);

  return {
    filename: `report-card-${verificationCode.toLowerCase()}.pdf`,
    contentType: 'application/pdf',
    byteLength: content.length,
    checksumSha256: createHash('sha256').update(content).digest('hex'),
    generatedAt,
    rowCount: payload.subjects.length,
    content,
  };
}

export const createPdfReportArtifact = createReportCardPdfArtifact;

export interface BulkReportCardEntry {
  payload: ReportCardPayload;
  verificationCode: string;
}

// Disk spooling bounds memory and lets generation fail before any PDF bytes are sent.
// The caller streams the completed file and removes it when the response closes.
export async function createBulkReportCardPdfFile(entries: AsyncIterable<BulkReportCardEntry>, limits = { maxBytes:512*1024*1024,maxPages:20000,maxDurationMs:15*60*1000 }) {
  const directory = await mkdtemp(join(tmpdir(), 'myshule-report-cards-'));
  const path = join(directory, 'report-cards.pdf');
  const cleanup = async () => { await unlink(path).catch(() => undefined); await rmdir(directory).catch(() => undefined); };
  const document = new PDFDocument({ autoFirstPage: false, bufferPages: false, compress: true, margin: 0, size: 'A4',
    info:{ CreationDate:new Date(0),ModDate:new Date(0) } });
  let bytes=0;
  const bounded=new Transform({ transform(chunk:Buffer,_encoding,callback) {
    bytes+=chunk.length;
    callback(bytes>limits.maxBytes ? new Error('Report export exceeds its file size limit; select a smaller scope') : null,chunk);
  } });
  const written = pipeline(document,bounded, createWriteStream(path, { flags: 'wx', mode: 0o600 }));
  // Attach immediately: disk errors must not become unhandled rejections during rendering.
  void written.catch(() => undefined);
  let count = 0;
  const started=Date.now();
  try {
    for await (const entry of entries) {
      if (count>=limits.maxPages || Date.now()-started>limits.maxDurationMs) throw new Error('Report export exceeds its work limit; select a smaller scope');
      if (document.destroyed) {
        await written; // Preserve the actual disk/size failure for useful recovery.
        throw new Error('Report PDF output stream closed');
      }
      document.addPage({ size: 'A4', margin: 0 });
      renderReportCardPageContent(document, entry.payload, entry.verificationCode, normalizeReportGeneratedAt(entry.payload.generated_at));
      count++;
      await yieldToEventLoop();
      while (document.readableLength > 1024 * 1024 && !document.destroyed) {
        await waitForWriter(5);
      }
    }
    document.end();
    await written;
    return { path, count, cleanup };
  } catch (error) {
    document.destroy();
    await written.catch(() => undefined);
    await cleanup();
    throw error;
  }
}

export function createBulkReportCardPdfBuffer(
  entries: BulkReportCardEntry[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const now = new Date().toISOString();
    const document = new PDFDocument({
      autoFirstPage: false,
      bufferPages: false,
      compress: true,
      margin: 0,
      size: 'A4',
      info: {
        Title: `Report Cards (${entries.length})`,
        Subject: 'Bulk Report Card Download',
        CreationDate: new Date(now),
      },
    });

    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    document.on('error', reject);
    document.on('end', () => resolve(Buffer.concat(chunks)));

    for (const entry of entries) {
      document.addPage({ size: 'A4', margin: 0 });
      const generatedAt = normalizeReportGeneratedAt(entry.payload.generated_at);
      renderReportCardPageContent(document, entry.payload, entry.verificationCode, generatedAt);
    }

    document.end();
  });
}

function renderReportCardPageContent(
  document: PDFKit.PDFDocument,
  payload: ReportCardPayload,
  verificationCode: string,
  generatedAt: string,
) {
  document.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill('#ffffff');
  drawHeader(document, payload, verificationCode);
  drawStudentInformation(document, payload);
  const performanceBottom = drawAcademicPerformance(document, payload);
  const analyticsBottom = drawAnalyticsAndOverview(document, payload, performanceBottom + 8);
  drawCommentsAndSignatures(document, payload, analyticsBottom + 8);
  drawFooter(document, verificationCode, generatedAt);
}

function renderReportCardPdf(
  payload: ReportCardPayload,
  verificationCode: string,
  generatedAt: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const document = new PDFDocument({
      autoFirstPage: true,
      bufferPages: false,
      compress: true,
      margin: 0,
      size: 'A4',
      info: {
        Title: `${payload.template_fields.learner_name} Report Card`,
        Author: payload.template_fields.school_name,
        Subject: payload.template_fields.exam_series
          ? `Academic Report Card - ${payload.template_fields.exam_series}`
          : 'Academic Report Card',
        CreationDate: new Date(generatedAt),
        ModDate: new Date(generatedAt),
      },
    });

    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    document.on('error', reject);
    document.on('end', () => resolve(Buffer.concat(chunks)));

    renderReportCardPageContent(document, payload, verificationCode, generatedAt);
    document.end();
  });
}

function drawHeader(document: PDFKit.PDFDocument, payload: ReportCardPayload, verificationCode: string) {
  const fields = payload.template_fields;
  const series = asRecord(payload.exam_series);
  const crestX = MARGIN + 7;
  const crestY = 21;
  const crestSize = 57;
  const logo = dataImage(fields.school_logo_ref);

  document.roundedRect(crestX, crestY, crestSize, crestSize, 8).lineWidth(1).strokeColor(GOLD).stroke();
  if (logo) {
    try {
      document.image(logo, crestX + 4, crestY + 4, { fit: [crestSize - 8, crestSize - 8], align: 'center', valign: 'center' });
    } catch {
      drawInitialsCrest(document, crestX, crestY, crestSize, fields.school_name);
    }
  } else {
    drawInitialsCrest(document, crestX, crestY, crestSize, fields.school_name);
  }

  const brand = [{ text: 'My', color: NAVY }, { text: 'Shule', color: GOLD }];
  document.font('Helvetica-Bold').fontSize(25);
  const brandWidth = brand.reduce((sum, item) => sum + document.widthOfString(item.text), 0);
  const markWidth = 30;
  const brandGap = 6;
  let brandX = (PAGE_WIDTH - brandWidth - markWidth - brandGap) / 2 + markWidth + brandGap;
  drawMyShuleMark(document, brandX - markWidth - brandGap, 19, markWidth, 27);
  for (const item of brand) {
    document.fillColor(item.color).text(item.text, brandX, 22, { lineBreak: false });
    brandX += document.widthOfString(item.text);
  }

  document
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor(NAVY)
    .text(fields.school_name, 102, 53, { width: PAGE_WIDTH - 204, align: 'center', ellipsis: true, lineBreak: false });
  if (fields.school_motto) {
    document.font('Helvetica-Oblique').fontSize(7).fillColor(MUTED).text(fields.school_motto, 112, 75, {
      width: PAGE_WIDTH - 224,
      align: 'center',
      ellipsis: true,
      lineBreak: false,
    });
  }

  document.roundedRect(PAGE_WIDTH - MARGIN - 68, 28, 68, 38, 6).fillAndStroke(SOFT, LINE);
  document.font('Helvetica-Bold').fontSize(5.5).fillColor(MUTED).text('REPORT NO.', PAGE_WIDTH - MARGIN - 64, 34, { width: 60, align: 'center' });
  document.fontSize(verificationCode.length>12?4.5:7).fillColor(NAVY).text(verificationCode, PAGE_WIDTH - MARGIN - 64, 44, { width: 60, align: 'center', lineBreak: false });

  const term = reportPeriod(fields.term, fields.academic_year);
  const curriculum = recordText(series, 'curriculum_model', 'reporting_mode', 'curriculum');
  drawCenteredSegments(document, 89, [
    'Academic Report Card',
    term,
    curriculum ? `Curriculum: ${curriculum}` : '',
  ].filter(Boolean));

  const contacts = [fields.school_address, fields.school_email, fields.school_phone].filter((item): item is string => Boolean(item));
  document.font('Helvetica').fontSize(6.5).fillColor(MUTED).text(contacts.join('  |  '), MARGIN + 45, 106, {
    width: CONTENT_WIDTH - 90,
    align: 'center',
    ellipsis: true,
    lineBreak: false,
  });
  document.moveTo(MARGIN, 121).lineTo(PAGE_WIDTH - MARGIN, 121).lineWidth(2).strokeColor(NAVY).stroke();
}

function drawMyShuleMark(document: PDFKit.PDFDocument, x: number, y: number, width: number, height: number) {
  const bottom = y + height - 5;
  document
    .path(`M ${x + 5} ${bottom} C ${x + 1} ${bottom} ${x} ${bottom - 4} ${x} ${bottom - 7} C ${x} ${bottom - 12} ${x + 4} ${bottom - 15} ${x + 9} ${bottom - 15} C ${x + 11} ${y + 2} ${x + 17} ${y} ${x + 21} ${y + 3} C ${x + 25} ${y + 4} ${x + 27} ${y + 8} ${x + 27} ${y + 12} C ${x + 31} ${y + 13} ${x + 32} ${y + 17} ${x + 31} ${y + 20} C ${x + 30} ${bottom - 1} ${x + 27} ${bottom} ${x + 24} ${bottom} Z`)
    .lineWidth(1.8)
    .strokeColor(NAVY)
    .stroke();
  document.moveTo(x + 8, y + 12).lineTo(x + 8, bottom - 1).lineTo(x + 15, y + 16).lineTo(x + 21, y + 11).lineTo(x + 21, bottom - 1)
    .lineWidth(3).strokeColor(NAVY).stroke();
  document.moveTo(x + 15, y + 16).lineTo(x + 21, y + 11).lineTo(x + 21, bottom - 1)
    .lineWidth(3).strokeColor(GOLD).stroke();
  document.circle(x + 15, bottom + 3, 1.8).fill(GOLD);
}

function drawInitialsCrest(document: PDFKit.PDFDocument, x: number, y: number, size: number, schoolName: string) {
  document.roundedRect(x + 4, y + 4, size - 8, size - 8, 6).fill(NAVY);
  document.font('Helvetica-Bold').fontSize(18).fillColor('#ffffff').text(initials(schoolName), x + 4, y + 18, {
    width: size - 8,
    align: 'center',
    lineBreak: false,
  });
  document.moveTo(x + 12, y + size - 12).lineTo(x + size - 12, y + size - 12).lineWidth(2).strokeColor(GOLD).stroke();
}

function drawCenteredSegments(document: PDFKit.PDFDocument, y: number, segments: string[]) {
  document.font('Helvetica-Bold').fontSize(7.5);
  const gap = 13;
  const widths = segments.map((segment) => document.widthOfString(segment));
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) + ((segments.length - 1) * gap);
  let x = (PAGE_WIDTH - totalWidth) / 2;
  segments.forEach((segment, index) => {
    document.fillColor(NAVY).text(segment, x, y, { lineBreak: false });
    x += widths[index] ?? 0;
    if (index < segments.length - 1) {
      document.moveTo(x + (gap / 2), y).lineTo(x + (gap / 2), y + 9).lineWidth(0.5).strokeColor('#9ca9bc').stroke();
      x += gap;
    }
  });
  document.moveTo(MARGIN + 70, y + 13).lineTo(PAGE_WIDTH - MARGIN - 70, y + 13).lineWidth(0.7).strokeColor(GOLD).stroke();
}

function drawStudentInformation(document: PDFKit.PDFDocument, payload: ReportCardPayload) {
  const fields = payload.template_fields;
  const student = asRecord(payload.student);
  const series = asRecord(payload.exam_series);
  const attendance = asRecord(payload.attendance);
  const y = 132;
  const height = 82;
  drawCard(document, MARGIN, y, CONTENT_WIDTH, height);
  drawSectionTitle(document, 'STUDENT INFORMATION', MARGIN + 13, y + 8);

  const persistedFields: Array<[string, string | null]> = [
    ['Student Name', fields.learner_name || null],
    ['Adm No.', fields.admission_number],
    ['Grade/Class', fields.learner_class],
    ['Stream', fields.learner_stream],
    ['Gender', recordText(student, 'gender')],
    ['Academic Year', fields.academic_year],
    ['Class Teacher', recordText(student, 'class_teacher_name')],
    ['Days Present', attendanceLabel(attendance)],
    ['Closing Date', reportDate(series, 'closing_date')],
    ['Opening Date', fields.next_term_opening_date ? formatDate(fields.next_term_opening_date) : null],
  ];
  const availableFields = persistedFields.filter((entry): entry is [string, string] => Boolean(entry[1]));
  const rows = Array.from({ length: Math.ceil(availableFields.length / 5) }, (_, index) => availableFields.slice(index * 5, (index + 1) * 5));

  const gridY = y + 25;
  const rowHeight = 27;
  rows.forEach((row, rowIndex) => row.forEach(([label, display], columnIndex) => {
    const cellWidth = (CONTENT_WIDTH - 12) / row.length;
    const cellX = MARGIN + 6 + (columnIndex * cellWidth);
    const cellY = gridY + (rowIndex * rowHeight);
    if (rowIndex === 1) document.moveTo(cellX, cellY).lineTo(cellX + cellWidth, cellY).lineWidth(0.5).strokeColor(LINE).stroke();
    if (columnIndex > 0) document.moveTo(cellX, cellY + 2).lineTo(cellX, cellY + rowHeight - 2).lineWidth(0.5).strokeColor(LINE).stroke();
    document.font('Helvetica-Bold').fontSize(6.5).fillColor(NAVY).text(label, cellX + 3, cellY + 5, { width: cellWidth - 6, align: 'center', lineBreak: false });
    document.font('Helvetica').fontSize(7.5).fillColor(INK).text(display, cellX + 3, cellY + 15, { width: cellWidth - 6, align: 'center', ellipsis: true, lineBreak: false });
  }));
}

function drawAcademicPerformance(document: PDFKit.PDFDocument, payload: ReportCardPayload) {
  const y = 222;
  const subjectCount = Math.max(payload.subjects.length, 1);
  const rowHeight = Math.max(7.5, Math.min(14, 168 / subjectCount));
  const tableHeaderHeight = 18;
  const titleHeight = 19;
  const enteredSubjects = payload.subjects.filter(isEntered);
  const totals = asRecord(payload.totals);
  const summary: Array<[string, string]> = [];
  if (enteredSubjects.length) summary.push(['Average', `${formatNumber(payload.totals.percentage)}%`]);
  const overallGrade = recordText(totals, 'overall_grade', 'grade_label');
  if (overallGrade) summary.push(['Overall Grade', overallGrade]);
  const classPosition = recordText(totals, 'class_position', 'position');
  if (classPosition) summary.push(['Class Position', classPosition]);
  else if (payload.totals.total_max_score > 0) summary.push(['Total Score', `${formatNumber(payload.totals.total_score)} / ${formatNumber(payload.totals.total_max_score)}`]);
  const summaryHeight = summary.length ? 23 : 0;
  const rowsHeight = rowHeight * subjectCount;
  const height = titleHeight + tableHeaderHeight + rowsHeight + summaryHeight;
  const examName = recordText(payload.template_fields, 'exam_series')
    ?? recordText(payload.exam_series, 'name') ?? 'Assessment';
  const columns = [
    { key: 'subject', label: 'Subject', weight: 2.2 },
    { key: 'result', label: examName, weight: 1.05 },
    { key: 'grade', label: 'Grade', weight: 0.85 },
    { key: 'achievement', label: 'Achievement Level', weight: 2.25 },
  ];
  const totalWeight = columns.reduce((sum, column) => sum + column.weight, 0);
  const columnWidths = columns.map((column) => (CONTENT_WIDTH * column.weight) / totalWeight);
  const headers = columns.map((column) => column.label);

  drawCard(document, MARGIN, y, CONTENT_WIDTH, height);
  document.roundedRect(MARGIN, y, CONTENT_WIDTH, titleHeight, 6).fill(NAVY);
  document.rect(MARGIN, y + 10, CONTENT_WIDTH, 9).fill(NAVY);
  document.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff').text('ACADEMIC PERFORMANCE', MARGIN + 12, y + 6, { lineBreak: false });
  const tableY = y + titleHeight;
  document.rect(MARGIN, tableY, CONTENT_WIDTH, tableHeaderHeight).fill('#edf4fb');
  drawTableRow(document, headers, columnWidths, MARGIN, tableY, tableHeaderHeight, true);

  if (payload.subjects.length) {
    payload.subjects.forEach((subject, index) => {
      const percentage = subjectPercentage(subject);
      const entered = isEntered(subject);
      const rowValues: Record<string, string> = {
        subject: subject.subject_name,
        result: entered && percentage !== null ? `${formatNumber(percentage)}%` : scoreStatus(subject.score_status),
        grade: entered ? subject.grade_label ?? '' : '',
        achievement: entered ? subject.descriptor ?? subject.remarks ?? '' : scoreStatus(subject.score_status),
      };
      const row = columns.map((column) => rowValues[column.key] ?? '');
      drawTableRow(document, row, columnWidths, MARGIN, tableY + tableHeaderHeight + (index * rowHeight), rowHeight, false);
    });
  }

  const summaryY = tableY + tableHeaderHeight + rowsHeight;
  if (summary.length) {
    document.rect(MARGIN, summaryY, CONTENT_WIDTH, summaryHeight).fillAndStroke('#fff9ec', GOLD);
    const summaryWidth = CONTENT_WIDTH / summary.length;
    summary.forEach(([label, display], index) => {
      const x = MARGIN + (index * summaryWidth);
      if (index > 0) document.moveTo(x, summaryY).lineTo(x, summaryY + summaryHeight).lineWidth(0.6).strokeColor(GOLD).stroke();
      const prefixWidth = document.font('Helvetica').fontSize(7.5).widthOfString(`${label}: `);
      const displayWidth = document.font('Helvetica-Bold').fontSize(11).widthOfString(display);
      const startX = x + ((summaryWidth - prefixWidth - displayWidth) / 2);
      document.font('Helvetica').fontSize(7.5).fillColor(INK).text(`${label}: `, startX, summaryY + 7, { lineBreak: false });
      document.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text(display, startX + prefixWidth, summaryY + 4.5, { lineBreak: false });
    });
  }
  return y + height;
}

function drawTableRow(
  document: PDFKit.PDFDocument,
  values: string[],
  widths: number[],
  x: number,
  y: number,
  height: number,
  header: boolean,
) {
  let cursor = x;
  values.forEach((display, index) => {
    const width = widths[index] ?? 0;
    document.rect(cursor, y, width, height).lineWidth(0.35).strokeColor(LINE).stroke();
    document
      .font(header ? 'Helvetica-Bold' : index === 0 ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(header ? 6.4 : Math.max(5.4, Math.min(7, height - 2)))
      .fillColor(header ? NAVY : INK)
      .text(display, cursor + 3, y + Math.max(1.3, (height - (header ? 7 : 6)) / 2), {
        width: width - 6,
        height: Math.max(5, height - 2),
        align: index === 0 ? 'left' : 'center',
        ellipsis: true,
        lineBreak: false,
      });
    cursor += width;
  });
}

function drawAnalyticsAndOverview(document: PDFKit.PDFDocument, payload: ReportCardPayload, y: number) {
  const gap = 8;
  const leftWidth = 385;
  const rightWidth = CONTENT_WIDTH - leftWidth - gap;
  const height = 165;
  drawCard(document, MARGIN, y, leftWidth, height);
  drawCard(document, MARGIN + leftWidth + gap, y, rightWidth, height);
  drawSectionTitle(document, 'PERFORMANCE ANALYTICS', MARGIN + 12, y + 8);
  drawSectionTitle(document, 'SUMMARY OVERVIEW', MARGIN + leftWidth + gap + 12, y + 8);

  const entries = payload.subjects
    .map((subject) => ({ subject, percentage: subjectPercentage(subject) }))
    .filter((entry): entry is { subject: ReportCardSubjectPayload; percentage: number } => entry.percentage !== null)
    .sort((left, right) => right.percentage - left.percentage);
  const persistedTermHistory = payload.analytics?.term_history ?? [];
  const termHistory = persistedTermHistory.length
    ? [...persistedTermHistory].reverse()
    : [{
        exam_series_id: recordText(asRecord(payload.exam_series), 'id') ?? 'current',
        label: payload.template_fields.term ?? payload.template_fields.exam_series ?? '',
        percentage: payload.totals.percentage,
      }].filter((entry) => Boolean(entry.label));
  const chartGap = 8;
  const chartWidth = (leftWidth - 30 - chartGap) / 2;
  const chartY = y + 27;
  const chartHeight = height - 38;
  drawTermTrendChart(document, MARGIN + 11, chartY, chartWidth, chartHeight, termHistory);
  drawSubjectPerformanceChart(
    document,
    MARGIN + 11 + chartWidth + chartGap,
    chartY,
    chartWidth,
    chartHeight,
    payload.analytics?.subject_history ?? [],
    entries.slice(0, 4),
    payload.template_fields.term ?? payload.template_fields.exam_series ?? '',
  );

  const attendance = asRecord(payload.attendance);
  const comments = payload.template_fields;
  const overview: Array<[string, string | null | undefined]> = [
    ['Attendance', attendancePercentage(attendance)],
    ['Best Subject', entries[0]?.subject.subject_name],
    ['Improvement', recordText(asRecord(payload.totals), 'improvement', 'improvement_percentage')],
    ['Conduct', comments.conduct_summary],
  ];
  const availableOverview = overview.filter((entry): entry is [string, string] => Boolean(entry[1]));
  const cardStep = Math.min(32, 128 / Math.max(1, availableOverview.length));
  availableOverview.forEach(([label, display], index) => {
    const cardX = MARGIN + leftWidth + gap + 9;
    const cardY = y + 27 + (index * cardStep);
    const cardHeight = Math.min(27, cardStep - 4);
    document.roundedRect(cardX, cardY, rightWidth - 18, cardHeight, 5).fillAndStroke(index % 2 ? '#fff8e8' : SOFT, LINE);
    drawOverviewIcon(document, index, cardX + 4, cardY + 3, 21);
    document.font('Helvetica-Bold').fontSize(5.5).fillColor(MUTED).text(label.toUpperCase(), cardX + 31, cardY + 5, { width: rightWidth - 52, lineBreak: false });
    document.font('Helvetica-Bold').fontSize(8.5).fillColor(NAVY).text(display, cardX + 31, cardY + 14, { width: rightWidth - 52, ellipsis: true, lineBreak: false });
  });
  return y + height;
}

function drawTermTrendChart(
  document: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  history: Array<{ exam_series_id: string; label: string; percentage: number }>,
) {
  document.roundedRect(x, y, width, height, 5).fillAndStroke('#fbfdff', LINE);
  document.font('Helvetica-Bold').fontSize(6.5).fillColor(NAVY).text('Term Performance Trend', x + 5, y + 7, { width: width - 10, align: 'center', lineBreak: false });
  const plot = { x: x + 24, y: y + 24, width: width - 34, height: height - 47 };
  drawChartAxes(document, plot.x, plot.y, plot.width, plot.height);
  const points = history.map((entry, index) => ({
    ...entry,
    x: plot.x + 8 + (((plot.width - 16) * index) / Math.max(1, history.length - 1)),
    y: plot.y + plot.height - ((Math.max(0, Math.min(100, entry.percentage)) / 100) * plot.height),
  }));
  if (points.length > 1) {
    document.moveTo(points[0]?.x ?? plot.x, points[0]?.y ?? plot.y);
    points.slice(1).forEach((point) => document.lineTo(point.x, point.y));
    document.lineWidth(1.4).strokeColor(GOLD).stroke();
  }
  points.forEach((point) => {
    document.circle(point.x, point.y, 3.2).fill(GOLD);
    document.font('Helvetica-Bold').fontSize(5.2).fillColor(NAVY).text(`${formatNumber(point.percentage)}%`, point.x - 15, Math.max(plot.y - 1, point.y - 10), { width: 30, align: 'center', lineBreak: false });
    document.font('Helvetica').fontSize(4.5).fillColor(MUTED).text(abbreviate(point.label, 9), point.x - 18, plot.y + plot.height + 5, { width: 36, align: 'center', lineBreak: false });
  });
}

function drawSubjectPerformanceChart(
  document: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  history: Array<{ exam_series_id: string; label: string; subject_id: string; subject_name: string; percentage: number }>,
  currentEntries: Array<{ subject: ReportCardSubjectPayload; percentage: number }>,
  currentLabel: string,
) {
  document.roundedRect(x, y, width, height, 5).fillAndStroke('#fbfdff', LINE);
  document.font('Helvetica-Bold').fontSize(6.5).fillColor(NAVY).text('Subject Performance', x + 5, y + 7, { width: width - 10, align: 'center', lineBreak: false });
  const plot = { x: x + 24, y: y + 24, width: width - 34, height: height - 47 };
  drawChartAxes(document, plot.x, plot.y, plot.width, plot.height);
  const terms = history.length
    ? [...new Map(history.map((entry) => [entry.exam_series_id, entry.label])).entries()].map(([id, label]) => ({ id, label }))
    : currentLabel ? [{ id: 'current', label: currentLabel }] : [];
  const subjects = history.length
    ? [...new Map(history.map((entry) => [entry.subject_id, entry.subject_name])).entries()].slice(0, 4).map(([id, name]) => ({ id, name }))
    : currentEntries.map((entry) => ({ id: entry.subject.subject_id, name: entry.subject.subject_name }));
  const colors = [NAVY, GOLD, '#6fa83a', '#7244b8'];
  subjects.forEach((subject, subjectIndex) => {
    const points = terms.map((term, termIndex) => {
      const persisted = history.find((entry) => entry.exam_series_id === term.id && entry.subject_id === subject.id);
      const current = !history.length ? currentEntries.find((entry) => entry.subject.subject_id === subject.id) : null;
      const percentage = persisted?.percentage ?? current?.percentage;
      if (percentage === undefined) return null;
      return {
        x: plot.x + 8 + (((plot.width - 16) * termIndex) / Math.max(1, terms.length - 1)),
        y: plot.y + plot.height - ((Math.max(0, Math.min(100, percentage)) / 100) * plot.height),
      };
    }).filter((point): point is { x: number; y: number } => point !== null);
    if (points.length > 1) {
      document.moveTo(points[0]?.x ?? plot.x, points[0]?.y ?? plot.y);
      points.slice(1).forEach((point) => document.lineTo(point.x, point.y));
      document.lineWidth(1.1).strokeColor(colors[subjectIndex] ?? NAVY).stroke();
    }
    points.forEach((point) => document.circle(point.x, point.y, 2.4).fill(colors[subjectIndex] ?? NAVY));
    const legendX = x + 8 + ((subjectIndex % 2) * ((width - 16) / 2));
    const legendY = y + height - 16 + (Math.floor(subjectIndex / 2) * 7);
    document.circle(legendX + 2, legendY + 2, 2).fill(colors[subjectIndex] ?? NAVY);
    document.font('Helvetica').fontSize(4.3).fillColor(MUTED).text(abbreviate(subject.name, 13), legendX + 7, legendY, { width: (width - 30) / 2, ellipsis: true, lineBreak: false });
  });
  terms.forEach((term, index) => {
    const labelX = plot.x + 8 + (((plot.width - 16) * index) / Math.max(1, terms.length - 1));
    document.font('Helvetica').fontSize(4.3).fillColor(MUTED).text(abbreviate(term.label, 8), labelX - 16, plot.y + plot.height + 4, { width: 32, align: 'center', lineBreak: false });
  });
}

function drawChartAxes(document: PDFKit.PDFDocument, x: number, y: number, width: number, height: number) {
  [0, 50, 100].forEach((tick) => {
    const tickY = y + height - ((tick / 100) * height);
    document.moveTo(x, tickY).lineTo(x + width, tickY).lineWidth(0.35).strokeColor(tick === 0 ? '#8997aa' : '#dfe6ef').stroke();
    document.font('Helvetica').fontSize(4).fillColor(MUTED).text(String(tick), x - 18, tickY - 2.5, { width: 14, align: 'right', lineBreak: false });
  });
  document.moveTo(x, y).lineTo(x, y + height).lineWidth(0.5).strokeColor('#8997aa').stroke();
}

function drawOverviewIcon(document: PDFKit.PDFDocument, index: number, x: number, y: number, size: number) {
  const accent = index % 2 ? GOLD : NAVY;
  document.roundedRect(x, y, size, size, 4).fill(accent);
  document.save().strokeColor('#ffffff').fillColor('#ffffff').lineWidth(1.1);
  if (index === 0) {
    document.circle(x + 8, y + 8, 2.2).fill('#ffffff');
    document.circle(x + 14, y + 8, 2.2).fill('#ffffff');
    document.roundedRect(x + 4, y + 12, 8, 4, 2).fill('#ffffff');
    document.roundedRect(x + 10, y + 12, 8, 4, 2).fill('#ffffff');
  } else if (index === 1) {
    document.roundedRect(x + 7, y + 5, 7, 8, 2).stroke();
    document.moveTo(x + 7, y + 7).lineTo(x + 4, y + 7).lineTo(x + 5, y + 11).lineTo(x + 8, y + 12).stroke();
    document.moveTo(x + 14, y + 7).lineTo(x + 17, y + 7).lineTo(x + 16, y + 11).lineTo(x + 13, y + 12).stroke();
    document.moveTo(x + 10.5, y + 13).lineTo(x + 10.5, y + 16).moveTo(x + 7, y + 17).lineTo(x + 14, y + 17).stroke();
  } else if (index === 2) {
    document.moveTo(x + 4, y + 15).lineTo(x + 8, y + 11).lineTo(x + 11, y + 13).lineTo(x + 17, y + 6).stroke();
    document.moveTo(x + 13, y + 6).lineTo(x + 17, y + 6).lineTo(x + 17, y + 10).stroke();
  } else {
    document.path(`M ${x + 10.5} ${y + 4} L ${x + 16} ${y + 7} L ${x + 15} ${y + 13} C ${x + 14} ${y + 16} ${x + 10.5} ${y + 18} ${x + 10.5} ${y + 18} C ${x + 10.5} ${y + 18} ${x + 7} ${y + 16} ${x + 6} ${y + 13} L ${x + 5} ${y + 7} Z`).stroke();
  }
  document.restore();
}

function drawCommentsAndSignatures(document: PDFKit.PDFDocument, payload: ReportCardPayload, y: number) {
  const height = Math.max(92, Math.min(205, 803 - y));
  drawCard(document, MARGIN, y, CONTENT_WIDTH, height);
  drawSectionTitle(document, 'COMMENTS', MARGIN + 12, y + 8);
  const commentsY = y + 26;
  const fields = payload.template_fields;

  const commentHeight = Math.max(42, Math.min(96, height - 58));
  const comments: Array<[string, string | null]> = [
    ['Class Teacher Comment', fields.class_teacher_comment],
    ['Principal Comment', fields.principal_comment],
  ];
  const availableComments = comments.filter((entry): entry is [string, string] => Boolean(entry[1]));
  const availableCommentWidth = (CONTENT_WIDTH - 16 - (Math.max(0, availableComments.length - 1) * 12)) / Math.max(1, availableComments.length);
  availableComments.forEach(([label, comment], index) => {
    drawComment(document, MARGIN + 8 + (index * (availableCommentWidth + 12)), commentsY, availableCommentWidth, commentHeight, label, comment);
  });
  const signatureY = y + height - 25;
  drawSignature(
    document,
    MARGIN + 80,
    signatureY,
    130,
    fields.class_teacher_name ?? '',
    'Class Teacher Signature',
    fields.class_teacher_signature_ref,
  );
  drawSignature(
    document,
    PAGE_WIDTH - MARGIN - 210,
    signatureY,
    130,
    fields.principal_name ?? '',
    'Principal Signature',
    fields.principal_signature_ref,
  );
}

function drawComment(document: PDFKit.PDFDocument, x: number, y: number, width: number, height: number, label: string, comment: string) {
  document.roundedRect(x, y, width, height, 4).fill(SOFT);
  document.rect(x, y, 3, height).fill(GOLD);
  document.font('Helvetica-Bold').fontSize(6.5).fillColor(NAVY).text(label, x + 9, y + 7, { lineBreak: false });
  document.font('Helvetica').fontSize(6.5).fillColor(INK).text(comment, x + 9, y + 17, {
    width: width - 17,
    height: Math.max(17, height - 24),
    ellipsis: true,
  });
}

function drawSignature(
  document: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  name: string,
  label: string,
  imageRef: string | null,
) {
  const image = dataImage(imageRef);
  if (image) {
    try {
      document.image(image, x, y - 24, { fit: [width, 21], align: 'center', valign: 'bottom' });
    } catch {
      // Invalid image bytes must not prevent a real report card from rendering.
    }
  }
  document.moveTo(x, y).lineTo(x + width, y).lineWidth(0.6).strokeColor(NAVY).stroke();
  document.font('Helvetica').fontSize(5.4).fillColor(MUTED).text(name, x, y + 3, { width, align: 'center', ellipsis: true, lineBreak: false });
  document.font('Helvetica-Bold').fontSize(6).fillColor(NAVY).text(label, x, y + 10, { width, align: 'center', lineBreak: false });
}

function drawFooter(document: PDFKit.PDFDocument, verificationCode: string, generatedAt: string) {
  const y = PAGE_HEIGHT - 28;
  document.moveTo(MARGIN, y - 7).lineTo(PAGE_WIDTH - MARGIN, y - 7).lineWidth(0.7).strokeColor(GOLD).stroke();
  document.font('Helvetica-Bold').fontSize(6.5).fillColor(NAVY).text('Generated securely by MyShule School Management System', MARGIN, y, { width: 310, lineBreak: false });
  document.font('Helvetica').fontSize(5.7).fillColor(MUTED).text(`Verification: ${verificationCode}  |  ${formatDate(generatedAt)}`, PAGE_WIDTH - MARGIN - 220, y, { width: 220, align: 'right', lineBreak: false });
}

function drawCard(document: PDFKit.PDFDocument, x: number, y: number, width: number, height: number) {
  document.roundedRect(x, y, width, height, 6).lineWidth(0.7).fillAndStroke('#ffffff', LINE);
}

function drawSectionTitle(document: PDFKit.PDFDocument, title: string, x: number, y: number) {
  document.circle(x + 3, y + 4, 3).fill(GOLD);
  document.font('Helvetica-Bold').fontSize(8).fillColor(NAVY).text(title, x + 11, y, { lineBreak: false });
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function recordText(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const display = record[key];
    if (typeof display === 'string' && display.trim()) return display.trim();
    if (typeof display === 'number' && Number.isFinite(display)) return String(display);
  }
  return null;
}

function recordNumber(record: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const display = record[key];
    if (display === null || display === undefined || display === '') continue;
    const parsed = Number(display);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function isEntered(subject: ReportCardSubjectPayload): subject is ReportCardSubjectPayload & { score: number } {
  return subject.score_status === 'entered' && typeof subject.score === 'number' && Number.isFinite(subject.score);
}

function subjectPercentage(subject: ReportCardSubjectPayload): number | null {
  if (!isEntered(subject)) return null;
  if (typeof subject.percentage === 'number' && Number.isFinite(subject.percentage)) return Math.max(0, Math.min(100, subject.percentage));
  if (subject.max_score <= 0) return null;
  return Math.max(0, Math.min(100, (subject.score / subject.max_score) * 100));
}

function scoreStatus(status: string) {
  const labels: Record<string, string> = {
    absent: 'Absent',
    exempt: 'Exempt',
    not_assessed: 'Not assessed',
    incomplete: 'Incomplete',
    withheld: 'Withheld',
    medical_exception: 'Medical exception',
    transfer_student: 'Transfer student',
  };
  return labels[status] ?? status.replace(/_/g, ' ').replace(/^./, (value) => value.toUpperCase());
}

function attendanceLabel(attendance: Record<string, unknown>): string | null {
  const present = recordNumber(attendance, 'days_present');
  const total = recordNumber(attendance, 'total_days');
  if (present === null) return null;
  return total === null ? formatNumber(present) : `${formatNumber(present)}/${formatNumber(total)}`;
}

function attendancePercentage(attendance: Record<string, unknown>): string | null {
  const persisted = recordNumber(attendance, 'percentage', 'attendance_percentage');
  if (persisted !== null) return `${formatNumber(persisted)}%`;
  const present = recordNumber(attendance, 'days_present');
  const total = recordNumber(attendance, 'total_days');
  return present !== null && total !== null && total > 0
    ? `${formatNumber((present / total) * 100)}%`
    : null;
}

function reportDate(record: Record<string, unknown>, ...keys: string[]): string | null {
  const persisted = recordText(record, ...keys);
  return persisted ? formatDate(persisted) : null;
}

function formatDate(input: string) {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.valueOf())) return input;
  return new Intl.DateTimeFormat('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
}

function formatNumber(input: number) {
  return Number.isInteger(input) ? String(input) : String(Number(input.toFixed(2)));
}

function reportPeriod(term: string | null, year: string | null) {
  return [term, year].filter(Boolean).join(', ');
}

function initials(input: string) {
  return input.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'S';
}

function abbreviate(input: string, length: number) {
  const clean = input.trim();
  return clean.length <= length ? clean : `${clean.slice(0, Math.max(1, length - 1))}.`;
}

function dataImage(input: string | null): Buffer | null {
  if (!input) return null;
  const match = input.match(/^data:image\/(?:png|jpe?g);base64,([a-z0-9+/=\r\n]+)$/i);
  if (!match?.[1]) return null;
  try {
    return Buffer.from(match[1], 'base64');
  } catch {
    return null;
  }
}
