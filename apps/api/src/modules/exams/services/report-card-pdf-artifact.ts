import { createHash } from 'node:crypto';
import PDFDocument from 'pdfkit';
import { normalizeReportFilename, normalizeReportGeneratedAt, type ReportArtifact } from '../../../common/reports/report-artifact';
import type { ReportCardPayload } from './report-card-template.service';

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

function renderReportCardPdf(payload: ReportCardPayload, verificationCode: string, generatedAt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const document = new PDFDocument({
      autoFirstPage: true,
      bufferPages: false,
      compress: false,
      margin: 50,
      size: 'A4',
      info: {
        Title: `${payload.template_fields.learner_name} Report Card`,
        Author: payload.template_fields.school_name,
        Subject: `Report Card ${payload.template_fields.exam_series}`,
        CreationDate: new Date(generatedAt),
        ModDate: new Date(generatedAt),
      },
    });

    document.on('data', (chunk: Buffer) => chunks.push(chunk));
    document.on('error', reject);
    document.on('end', () => resolve(Buffer.concat(chunks)));

    const fields = payload.template_fields;

    // Header
    document.fontSize(20).font('Helvetica-Bold').text(fields.school_name, { align: 'center' });
    document.fontSize(10).font('Helvetica').text(fields.school_contacts || '', { align: 'center' });
    document.moveDown(2);

    document.fontSize(14).font('Helvetica-Bold').text('STUDENT REPORT CARD', { align: 'center' });
    document.moveDown(1);

    // Student Details
    document.fontSize(10).font('Helvetica');
    const startX = 50;
    let currentY = document.y;
    
    document.text(`Name: ${fields.learner_name}`, startX, currentY);
    document.text(`Admission: ${fields.admission_number || 'N/A'}`, startX + 250, currentY);
    currentY += 15;
    document.text(`Class/Stream: ${fields.class_stream || 'N/A'}`, startX, currentY);
    document.text(`Term: ${fields.term || 'N/A'}`, startX + 250, currentY);
    currentY += 15;
    document.text(`Year: ${fields.academic_year || 'N/A'}`, startX, currentY);
    document.text(`Exam: ${fields.exam_series || 'N/A'}`, startX + 250, currentY);
    
    document.moveDown(2);
    
    const isCbc = payload.subjects.some(s => s.competency_outcome || s.descriptor);

    // Table Header
    currentY = document.y;
    document.font('Helvetica-Bold');
    
    if (isCbc) {
      document.text('Learning Area', startX, currentY);
      document.text('Score', startX + 150, currentY);
      document.text('Competency', startX + 220, currentY);
      document.text('Descriptor', startX + 320, currentY);
    } else {
      document.text('Subject', startX, currentY);
      document.text('Score', startX + 150, currentY);
      document.text('Out Of', startX + 220, currentY);
      document.text('Grade', startX + 290, currentY);
      document.text('Remarks', startX + 360, currentY);
    }
    
    document.moveTo(startX, currentY + 15).lineTo(545, currentY + 15).stroke();
    
    document.moveDown(1);
    currentY = document.y;
    document.font('Helvetica');
    
    for (const subject of payload.subjects) {
      if (isCbc) {
        document.text(subject.subject_name, startX, currentY);
        document.text(subject.score.toString(), startX + 150, currentY);
        document.text(subject.competency_outcome || '-', startX + 220, currentY);
        document.text(subject.descriptor || '-', startX + 320, currentY);
      } else {
        document.text(subject.subject_name, startX, currentY);
        document.text(subject.score.toString(), startX + 150, currentY);
        document.text(subject.max_score.toString(), startX + 220, currentY);
        document.text(subject.grade_label || '-', startX + 290, currentY);
        document.text(subject.remarks || '-', startX + 360, currentY);
      }
      currentY += 15;
    }
    
    document.moveTo(startX, currentY + 5).lineTo(545, currentY + 5).stroke();
    document.moveDown(2);
    
    currentY = document.y;
    document.font('Helvetica-Bold');
    document.text(`Total Score: ${payload.totals.total_score} / ${payload.totals.total_max_score}`, startX, currentY);
    document.text(`Mean Score: ${payload.totals.mean_score}`, startX + 150, currentY);
    document.text(`Percentage: ${payload.totals.percentage}%`, startX + 300, currentY);
    
    document.moveDown(3);
    
    // Comments
    document.font('Helvetica-Bold').text('Class Teacher Comment:', startX, document.y);
    document.font('Helvetica').text(fields.class_teacher_comment || '__________________________________________');
    document.moveDown(1);
    
    document.font('Helvetica-Bold').text('Principal Comment:', startX, document.y);
    document.font('Helvetica').text(fields.principal_comment || '__________________________________________');
    document.moveDown(2);
    
    // Footer
    document.fontSize(8).font('Helvetica-Oblique').text(`Verification Code: ${verificationCode}`, startX, 750, { align: 'center' });
    document.text(`Generated at: ${generatedAt}`, startX, 760, { align: 'center' });

    document.end();
  });
}
