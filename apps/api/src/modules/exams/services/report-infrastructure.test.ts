import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash, createHmac } from 'node:crypto';
import {
  mkdtemp,
  writeFile,
  access,
  utimes,
  rmdir,
  unlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { S3CompatibleObjectStorageService } from '../../../common/uploads/s3-object-storage.service';
import {
  reportPdfIdentity,
  REPORT_RENDERER_VERSION,
} from './report-artifact-identity';
import { ReportCardArtifactsService } from './report-card-artifacts.service';
import { ReportCardTemplateService } from './report-card-template.service';
import { createBulkReportCardPdfFile } from './report-card-pdf-artifact';
import { removeAbandonedReportFiles } from './report-retention.service';
import { hydrateReportCardLogoForRendering } from './report-card-logo-hydration';
import { validateReportInfrastructureEnv } from '../../../config/env.validation';

const env: Record<string, string> = {
  UPLOAD_OBJECT_STORAGE_PROVIDER: 'r2',
  UPLOAD_OBJECT_STORAGE_REGION: 'auto',
  UPLOAD_OBJECT_STORAGE_ENDPOINT:
    'https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com',
  UPLOAD_OBJECT_STORAGE_BUCKET: 'private-reports',
  UPLOAD_OBJECT_STORAGE_ACCESS_KEY_ID: 'test-access',
  UPLOAD_OBJECT_STORAGE_SECRET_ACCESS_KEY: 'test-secret',
};
const objects = () =>
  new S3CompatibleObjectStorageService({
    get: (key: string) => env[key],
  } as never);
test('dedicated report R2 leaves existing Railway objects on their original storage', async () => {
  const config = {
    ...env,
    UPLOAD_OBJECT_STORAGE_PROVIDER: 's3',
    UPLOAD_OBJECT_STORAGE_ENDPOINT: 'https://t3.storageapi.dev',
    UPLOAD_OBJECT_STORAGE_BUCKET: 'legacy-files',
    ...Object.fromEntries(Object.entries(env).map(([key,value])=>[key.replace('UPLOAD_','REPORT_'),value])),
    REPORT_OBJECT_STORAGE_ENABLED: 'true',
  } as Record<string,string>;
  const service = new S3CompatibleObjectStorageService({get:(key:string)=>config[key]} as never);
  for (const [path,host,bucket] of [
    ['school_logo/logo.png','t3.storageapi.dev','legacy-files'],
    ['reports/legacy-export.pdf','t3.storageapi.dev','legacy-files'],
    ['reports/academic/random.pdf','0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com','private-reports'],
    ['reports/temporary/random.pdf','0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com','private-reports'],
  ]) {
    const input={tenantId:'school-a',storagePath:`tenant/school-a/${path}`};
    const url=new URL(service.signedGetUrl(input));
    assert.equal(url.hostname,host);
    assert.equal(url.pathname,`/${bucket}/${input.storagePath}`);
    const bytes=Buffer.from('test object');
    const fetcher=async (target:string)=>{
      assert.equal(new URL(target).hostname,host);
      assert.equal(new URL(target).pathname,url.pathname);
      return {ok:true,status:200,arrayBuffer:async()=>Uint8Array.from(bytes).buffer};
    };
    assert.equal((await service.putObject({...input,mimeType:'application/pdf',buffer:bytes},fetcher)).bucket,bucket);
    assert.deepEqual((await service.getObject(input,fetcher)).content,bytes);
    await service.deleteObject(input,fetcher);
  }
  assert.deepEqual(validateReportInfrastructureEnv({...config,NODE_ENV:'production'}),[]);
  assert.ok(validateReportInfrastructureEnv({...config,NODE_ENV:'production',REPORT_OBJECT_STORAGE_SECRET_ACCESS_KEY:''})
    .includes('REPORT_OBJECT_STORAGE_SECRET_ACCESS_KEY is required'));
  assert.ok(validateReportInfrastructureEnv({...config,NODE_ENV:'production',REPORT_OBJECT_STORAGE_ENDPOINT:'https://s3.amazonaws.com'}).length);
});
const payload = () =>
  new ReportCardTemplateService().buildPayload(
    {
      school: { name: 'Test School' },
      student: { full_name: 'Test Learner' },
      subjects: [
        {
          subject_id: 'math',
          subject_name: 'Mathematics',
          score: 75,
          max_score: 100,
        },
      ],
    },
    '2026-09-23T10:00:00Z',
  );
test('private R2 signatures bind tenant, exact object, expiry and download headers', () => {
  const service = objects();
  const url = new URL(
    service.signedGetUrl({
      tenantId: 'school-a',
      storagePath: 'tenant/school-a/reports/random.pdf',
      now: '2026-09-23T10:00:00Z',
      expiresSeconds: 60,
      filename: 'report.pdf',
    }),
  );
  assert.equal(url.searchParams.get('X-Amz-Expires'), '60');
  assert.equal(
    url.searchParams.get('response-cache-control'),
    'private, no-store',
  );
  const signature = url.searchParams.get('X-Amz-Signature')!;
  url.searchParams.delete('X-Amz-Signature');
  const encode = (value: string) =>
    encodeURIComponent(value).replace(
      /[!'()*]/g,
      (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
    );
  const canonical = [...url.searchParams]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([a, b]) => `${encode(a)}=${encode(b)}`)
    .join('&');
  const scope = '20260923/auto/s3/aws4_request';
  const key = ['20260923', 'auto', 's3', 'aws4_request'].reduce<Buffer>(
    (previous, part) => createHmac('sha256', previous).update(part).digest(),
    Buffer.from('AWS4test-secret'),
  );
  const sign = (path: string, query: string) =>
    createHmac('sha256', key)
      .update(
        [
          'AWS4-HMAC-SHA256',
          '20260923T100000Z',
          scope,
          createHash('sha256')
            .update(
              [
                'GET',
                path,
                query,
                `host:${url.host}\n`,
                'host',
                'UNSIGNED-PAYLOAD',
              ].join('\n'),
            )
            .digest('hex'),
        ].join('\n'),
      )
      .digest('hex');
  assert.equal(signature, sign(url.pathname, canonical));
  assert.notEqual(
    signature,
    sign(url.pathname.replace('school-a', 'school-b'), canonical),
  );
  assert.notEqual(
    signature,
    sign(
      url.pathname,
      canonical.replace('X-Amz-Expires=60', 'X-Amz-Expires=600'),
    ),
  );
  for (const path of [
    'tenant/school-b/file',
    'tenant/school-a/../school-b/file',
    'tenant/school-a\\file',
  ])
    assert.throws(() =>
      service.signedGetUrl({ tenantId: 'school-a', storagePath: path }),
    );
  assert.throws(() =>
    service.signedGetUrl({
      tenantId: 'school-a',
      storagePath: 'tenant/school-a/file',
      expiresSeconds: 86400,
    }),
  );
});
test('large-file storage streams one object, signs its checksum, and closes on transport failure', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'report-storage-test-'));
  const path = join(directory, 'report.pdf');
  const bytes = Buffer.alloc(2 * 1024 * 1024, 0x61);
  await writeFile(path, bytes);
  try {
    let stream: Readable | undefined;
    const result = await objects().putFile(
      {
        tenantId: 'school-a',
        storagePath: 'tenant/school-a/report.pdf',
        mimeType: 'application/pdf',
        path,
      },
      async (_url, init) => {
        assert.equal(init.method, 'PUT_FILE');
        if (init.method !== 'PUT_FILE') throw new Error('Expected stream');
        stream = init.body;
        assert.ok(stream instanceof Readable);
        const hash = createHash('sha256');
        let size = 0;
        for await (const chunk of stream) {
          assert.ok(chunk.length <= 256 * 1024);
          hash.update(chunk);
          size += chunk.length;
        }
        assert.equal(hash.digest('hex'), init.headers['x-amz-content-sha256']);
        assert.equal(size, Number(init.headers['Content-Length']));
        return { ok: true, status: 200, headers: { get: () => 'etag' } };
      },
    );
    assert.equal(result.size_bytes, bytes.length);
    assert.equal(stream?.destroyed, true);
    assert.equal(stream?.closed, true);
    await assert.rejects(
      () =>
        objects().putFile(
          {
            tenantId: 'school-a',
            storagePath: 'tenant/school-a/report.pdf',
            mimeType: 'application/pdf',
            path,
          },
          async (_url, init) => {
            if (init.method === 'PUT_FILE') stream = init.body;
            throw new Error('Network failed');
          },
        ),
      /storage upload failed/,
    );
    assert.equal(stream?.destroyed, true);
    assert.equal(stream?.closed, true);
  } finally {
    await unlink(path);
    await rmdir(directory);
  }
});
test('artifact identity is stable across JSON key order and approval, but changes with meaningful snapshot fields', () => {
  const card = {
    id: 'one',
    tenant_id: 'a',
    verification_code: 'VERIFY',
    workflow_version: 1,
    status: 'draft',
    metadata: { report_card: payload() },
  };
  assert.equal(
    reportPdfIdentity(card),
    reportPdfIdentity({ ...card, status: 'approved', workflow_version: 3 }),
  );
  assert.equal(
    reportPdfIdentity(card),
    reportPdfIdentity(JSON.parse(JSON.stringify(card))),
  );
  assert.notEqual(
    reportPdfIdentity(card),
    reportPdfIdentity({ ...card, tenant_id: 'b' }),
  );
  const changed = structuredClone(card);
  changed.metadata.report_card.template_fields.principal_comment = 'Changed';
  assert.notEqual(reportPdfIdentity(card), reportPdfIdentity(changed));
});
test('artifact reuse performs no rendering and rejects stale, foreign and withdrawn reports', async () => {
  const card = {
    id: 'one',
    tenant_id: 'a',
    student_id: 'student',
    is_current: true,
    status: 'published',
    verification_code: 'VERIFY',
    metadata: {
      report_card: payload(),
      source_revision: '[]',
      renderer_version: REPORT_RENDERER_VERSION,
    },
  };
  let tenant = 'a';
  let versionRows: any[] = [];
  let signed = 0;
  const repository = {
    executeSql: async (sql: string, values: unknown[]) => {
      if (sql.includes('SELECT * FROM student_report_cards'))
        return { rows: values[0] === 'a' ? [card] : [] };
      if (sql.includes('report_source_versions')) return { rows: versionRows };
      if (sql.includes('report_pdf_cache'))
        return { rows: [{ storage_path: 'tenant/a/reports/test.pdf' }] };
      throw new Error('Unexpected SQL');
    },
  };
  const artifacts = new ReportCardArtifactsService(
    repository as never,
    {
      deliveryForTenant: async () => {
        signed++;
        return { download_url: 'https://private.test', expires_at: 'future' };
      },
    } as never,
    {} as never,
    { requireStore: () => ({ tenant_id: tenant }) } as never,
    {} as never,
  );
  assert.equal((await artifacts.prepare('one')).state, 'ready');
  assert.equal(signed, 1);
  versionRows = [{ scope_key: 'school', version: '2' }];
  await assert.rejects(() => artifacts.prepare('one'), /changed/);
  versionRows = [];
  card.status = 'withdrawn';
  await assert.rejects(() => artifacts.prepare('one'), /withdrawn/);
  card.status = 'published';
  (card.metadata as any).source_valid_until = '2020-01-01T00:00:00Z';
  await assert.rejects(() => artifacts.prepare('one'), /grading policy/);
  tenant = 'b';
  await assert.rejects(() => artifacts.prepare('one'), /not found/);
  assert.equal(signed, 1);
});

test('legacy migration certifies identical payloads without changing approval or verification and rejects changed inputs', async () => {
  const data = {
    school: { name: 'Test School' },
    student: { full_name: 'Test Learner' },
    subjects: [
      {
        subject_id: 'math',
        subject_name: 'Mathematics',
        score: 75,
        max_score: 100,
      },
    ],
  };
  const card = {
    id: 'card',
    tenant_id: 'a',
    student_id: 'student',
    exam_series_id: 'exam',
    status: 'published',
    is_current: true,
    verification_code: 'OLD-VERIFICATION',
    metadata: { report_card: payload() } as Record<string, any>,
  };
  let changed = false;
  let mutations = 0;
  const repository = {
    loadReportCardData: async () =>
      changed ? { ...data, school: { name: 'Renamed School' } } : data,
    executeSql: async (sql: string) => {
      if (sql.includes('report_source_versions')) return { rows: [] };
      if (sql.includes('min(boundary)')) return { rows: [{ deadline: null }] };
      if (sql.includes('SELECT * FROM student_report_cards'))
        return { rows: [card] };
      throw new Error('Unexpected SQL');
    },
  };
  const db = {
    withRequestTransaction: async (fn: () => Promise<unknown>) => fn(),
    query: async (sql: string, args: any[]) => {
      mutations++;
      if (sql.includes('UPDATE student_report_cards')) {
        assert.match(sql, /metadata=\$5::jsonb/);
        card.metadata = { ...card.metadata, ...JSON.parse(args[3]) };
        return { rows: [{ id: card.id }] };
      }
      assert.match(sql, /report_card.artifact_migrated/);
      return { rows: [] };
    },
  };
  const artifacts = new ReportCardArtifactsService(
    repository as never,
    {} as never,
    db as never,
    { requireStore: () => ({ tenant_id: 'a', user_id: 'actor' }) } as never,
    {} as never,
  );
  // API fast paths must queue legacy work; only the worker performs certification.
  assert.equal(await artifacts.reusableSnapshot('a','exam','student'),null);
  assert.equal(mutations,0);
  let rendered=0;
  artifacts.ensurePdf=async()=>{rendered++;return 'tenant/a/legacy.pdf';};
  artifacts.cachedPath=async()=> 'tenant/a/legacy.pdf';
  const certified = await artifacts.reusableSnapshot('a','exam','student',true);
  assert.ok(certified);
  assert.equal(rendered,1);
  assert.equal(certified.status, 'published');
  assert.equal(certified.verification_code, 'OLD-VERIFICATION');
  assert.equal(certified.metadata.source_revision, '[]');
  assert.equal(mutations, 2);
  changed = true;
  await assert.rejects(
    () => (artifacts as any).certifyLegacySnapshot(card),
    /differs from current/,
  );
  assert.equal(mutations, 2);
});
test('renderer bounds pages and bytes and surfaces storage-image failures', async () => {
  async function* entries() {
    for (let i = 0; i < 3; i++)
      yield { payload: payload(), verificationCode: 'VERIFY' };
  }
  await assert.rejects(
    () =>
      createBulkReportCardPdfFile(entries(), {
        maxPages: 2,
        maxBytes: 1000000,
        maxDurationMs: 60000,
      }),
    /work limit/,
  );
  await assert.rejects(
    () =>
      createBulkReportCardPdfFile(entries(), {
        maxPages: 4,
        maxBytes: 20,
        maxDurationMs: 60000,
      }),
    /size limit/,
  );
  const report = payload();
  report.template_fields.principal_signature_ref = 'tenant/a/signature.png';
  await assert.rejects(
    () =>
      hydrateReportCardLogoForRendering(
        report,
        'a',
        {
          readForTenant: async () => {
            throw new Error('offline');
          },
        } as never,
        true,
      ),
    /could not be read/,
  );
});
test('abandoned-file cleanup removes only known old report spools', async () => {
  const root = await mkdtemp(join(tmpdir(), 'report-cleanup-test-'));
  const old = await mkdtemp(join(root, 'myshule-report-cards-'));
  const recent = await mkdtemp(join(root, 'myshule-report-cards-'));
  await writeFile(join(old, 'report-cards.pdf'), 'old');
  await writeFile(join(recent, 'report-cards.pdf'), 'new');
  const time = new Date(Date.now() - 2 * 86400000);
  await utimes(old, time, time);
  try {
    await removeAbandonedReportFiles(root);
    await assert.rejects(() => access(old));
    await access(recent);
  } finally {
    await unlink(join(recent, 'report-cards.pdf'));
    await rmdir(recent);
    await rmdir(root);
  }
});
test('production configuration requires private R2 and separated worker lanes', () => {
  assert.deepEqual(
    validateReportInfrastructureEnv({
      ...env,
      NODE_ENV: 'production',
      APP_RUNTIME: 'reports-worker',
      UPLOAD_OBJECT_STORAGE_ENABLED: 'true',
      REPORT_WORKER_LANE: 'bulk',
    }),
    [],
  );
  assert.ok(
    validateReportInfrastructureEnv({
      ...env,
      NODE_ENV: 'production',
      APP_RUNTIME: 'reports-worker',
      UPLOAD_OBJECT_STORAGE_ENABLED: 'false',
    }).length >= 2,
  );
  assert.ok(
    validateReportInfrastructureEnv({
      ...env,
      NODE_ENV: 'production',
      UPLOAD_OBJECT_STORAGE_ENABLED: 'true',
      UPLOAD_OBJECT_STORAGE_ENDPOINT: 'https://s3.amazonaws.com',
    }).length,
  );
});
