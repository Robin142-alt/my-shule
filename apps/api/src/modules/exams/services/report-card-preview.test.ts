import assert from 'node:assert/strict';
import test from 'node:test';
import { ReportCardDownloadController } from '../report-card-download.controller';

test('preview reads the same cached PDF as download after permission scope validation', async () => {
  const calls: string[] = [];
  const content = Buffer.from('%PDF-canonical-artifact');
  const controller = new ReportCardDownloadController({} as never, {
    assertReportCardScopeAccess() { calls.push('scope'); return 'school-a'; },
  } as never, {} as never, undefined, {
    async read(id: string) { calls.push(id); return { content, byteLength: content.length }; },
  } as never);
  const result = await controller.previewReportCard('card');
  const chunks: Buffer[] = [];
  for await (const chunk of result.getStream()) chunks.push(chunk);
  assert.deepEqual(Buffer.concat(chunks), content);
  assert.deepEqual(calls, ['scope', 'card']);
  assert.equal(result.getHeaders().type, 'application/pdf');
  assert.equal(result.getHeaders().disposition, 'inline');
});

test('preview never reads a file after a failed authorization check', async () => {
  let read = false;
  const controller = new ReportCardDownloadController({} as never, {
    assertReportCardScopeAccess() { throw new Error('Forbidden'); },
  } as never, {} as never, undefined, { async read() { read = true; } } as never);
  await assert.rejects(() => controller.previewReportCard('other-school-card'), /Forbidden/);
  assert.equal(read, false);
});
