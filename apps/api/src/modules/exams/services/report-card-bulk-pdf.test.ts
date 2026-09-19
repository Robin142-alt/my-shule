import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, access } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { createBulkReportCardPdfFile, createReportCardPdfArtifact } from './report-card-pdf-artifact';
import { ReportCardTemplateService } from './report-card-template.service';
function payload(name: string) {
  return new ReportCardTemplateService().buildPayload({ school: { name: 'Scope School', motto: 'Learning together' },
    student: { full_name: name, admission_number: 'ADM-' + name, class_name: 'Grade 8', stream_name: 'North' },
    exam_series: { name: 'Term 3 Assessment', academic_term_name: 'Term 3', academic_year_name: '2026' },
    subjects: [{ subject_id: 'math', subject_name: 'Mathematics', score: 84, score_status: 'entered', max_score: 100 }] }, '2026-09-19T10:00:00Z');
}
function contentStreams(pdf: Buffer) {
  const raw = pdf.toString('latin1');
  const streams: string[] = [];
  for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      streams.push(inflateSync(Buffer.from(match[1], 'latin1')).toString());
    }
    catch { /* Not a deflated content stream. */ }
  }
  return streams;
}
test('combined PDF starts each learner on a new A4 page and preserves the individual renderer and order', async () => {
  const names = ['Ada', 'Ben', 'Cara'];
  async function* entries() { for (const name of names)
    yield { payload: payload(name), verificationCode: 'VERIFY-' + name }; }
  const result = await createBulkReportCardPdfFile(entries());
  try {
    const pdf = await readFile(result.path);
    assert.equal(result.count, 3);
    assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length, 3);
    const bulkStreams = contentStreams(pdf);
    assert.equal(bulkStreams.length, 3);
    for (let i = 0; i < names.length; i++) {
      const single = await createReportCardPdfArtifact(payload(names[i]), 'VERIFY-' + names[i]);
      assert.equal(bulkStreams[i], contentStreams(single.content)[0], `Learner ${names[i]} must use exactly the individual page layout`);
    }
  }
  finally {
    await result.cleanup();
  }
  await assert.rejects(() => access(result.path));
});
test('PDF generation propagates a failed page source instead of returning an incomplete document', async () => {
  async function* entries() { yield { payload: payload('Ada'), verificationCode: 'VERIFY-Ada' }; throw new Error('Snapshot changed'); }
  await assert.rejects(() => createBulkReportCardPdfFile(entries()), /Snapshot changed/);
});
