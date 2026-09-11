import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { verifySidebarRecords } from './support/sidebar-record-checks';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1') throw new Error('Disposable PostgreSQL required');
  const databaseUrl = new URL(process.env.DATABASE_URL!);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(databaseUrl.hostname));
  assert.ok(databaseUrl.pathname.slice(1).startsWith('my_shule_disposable_'));
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
  const orm = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });
  try {
    const schema = readFileSync('apps/api/test/fixtures/sidebar-legacy-schema.sql', 'utf8').replace(/^\\.*$/gm, '');
    await pool.query(schema);
    await pool.query('SET search_path TO public');
    const schemaFailures: any[] = [];
    let fixture!: { tenantId: string; userId: string; classId: string };
    const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
    {
      const applied = new Set<string>();
      const bootstrapDb = { runSchemaBootstrap: async (sql: string) => { if (!applied.has(sql)) { await pool.query(sql); applied.add(sql); } }, query: (sql: string, params: any[]) => pool.query(sql, params) };
      const schemaInstances = new Map<string, any>([['PrismaService', bootstrapDb], ['DatabaseService', bootstrapDb]]);
      const schemaResolve = (Type: any): any => {
        if (!Type) return undefined;
        if (schemaInstances.has(Type.name)) return schemaInstances.get(Type.name);
        const value = new Type(...(Reflect.getMetadata('design:paramtypes', Type) || []).map(schemaResolve));
        schemaInstances.set(Type.name, value); return value;
      };
      let pending = walk(path.resolve('apps/api/src')).filter(file => file.endsWith('-schema.service.ts'));
      for (let attempt = 0; attempt < 3 && pending.length; attempt++) {
        const retry: string[] = [];
        for (const file of pending) {
          for (const Type of Object.values(require(file)) as any[]) {
            if (typeof Type !== 'function' || !Type.prototype.onModuleInit) continue;
            try { await schemaResolve(Type).onModuleInit(); }
            catch (error: any) { await pool.query('ROLLBACK'); retry.push(file); if (attempt === 2) { schemaFailures.push({ file, message: error.message }); console.log('SCHEMA FAIL', path.basename(file), error.message); } }
          }
        }
        pending = retry;
      }
      const { SIDEBAR_WORKSPACE_SCHEMA_SQL } = require('../src/modules/admin-command/sidebar-workspace-schema');
      fixture = await verifySidebarRecords(pool, SIDEBAR_WORKSPACE_SCHEMA_SQL);
    }
    const context = { tenant_id: fixture.tenantId, user_id: fixture.userId, role: 'principal', is_authenticated: true, permissions: ['*:*'] };
    const failures: any[] = [], passed: string[] = [], unavailable: Array<{route: string, message: string}> = [];
    let route = '';
    const query = async (sql: string, params: any[] = []) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN READ ONLY');
        await client.query('SET LOCAL search_path TO public');
        await client.query('SET LOCAL row_security TO on');
        await client.query("SELECT set_config('app.tenant_id',$1,true), set_config('app.user_id',$2,true)", [context.tenant_id, context.user_id]);
        return await client.query(sql, params);
      } catch (error: any) {
        failures.push({ route, code: error.code, message: error.message, position: error.position, sql, params });
        throw error;
      } finally { await client.query('ROLLBACK'); client.release(); }
    };
    const raw = async (sql: string, ...params: any[]) => (await query(sql, params)).rows;
    const db: any = { query, $queryRawUnsafe: raw, executeWithTenant: async (_tenant: string, _user: string, cb: any) => cb(db), withTenant: async (_tenant: string, cb: any) => cb(db) };
    for (const model of ['adminIncidents', 'visitorLog', 'appointment', 'frontOfficeTicket', 'transportRoute', 'maintenanceTicket']) {
      db[model] = { findMany: (args: unknown) => orm.$transaction(async tx => {
        await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
        await tx.$queryRawUnsafe("SELECT set_config('app.tenant_id',$1,true)", context.tenant_id);
        return (tx as any)[model].findMany(args);
      }) };
    }
    const instances = new Map<string, any>([
      ['PrismaService', db], ['DatabaseService', db],
      ['RequestContextService', { getStore: () => context, requireStore: () => context }],
      ['ConfigService', { get: (_key: string, fallback: any) => fallback }],
      ['PrincipalInsightsService', undefined],
    ]);
    const resolving = new Set();
    const resolve = (Type: any): any => {
      if (!Type) return undefined;
      if (instances.has(Type.name)) return instances.get(Type.name);
      if (resolving.has(Type.name)) return undefined;
      resolving.add(Type.name);
      const value = new Type(...(Reflect.getMetadata('design:paramtypes', Type) || []).map(resolve));
      instances.set(Type.name, value); resolving.delete(Type.name); return value;
    };
    const directory = path.resolve('apps/api/src/modules/admin-command');
    for (const file of readdirSync(directory).filter(f => f.endsWith('.controller.ts'))) {
      for (const Type of Object.values(require(path.join(directory, file))) as any[]) {
        if (typeof Type !== 'function') continue;
        let controller: any;
        try { controller = resolve(Type); } catch (error: any) { console.log('CONSTRUCTION', Type.name, error.message); continue; }
        for (const method of Object.getOwnPropertyNames(Type.prototype)) {
          const fn = Type.prototype[method];
          if (typeof fn !== 'function' || Reflect.getMetadata('method', fn) !== 0 || fn.length > 0 || Reflect.getMetadata('__sse__', fn)) continue;
          route = `${Reflect.getMetadata('path', Type)}/${Reflect.getMetadata('path', fn)}`;
          try { await controller[method](); passed.push(route); }
          catch (error: any) { unavailable.push({ route, message: error.message }); }
        }
      }
    }
    const { ClassTeacherController } = require('../src/modules/class-teacher/class-teacher.controller');
    context.role = 'class_teacher';
    const classTeacher = resolve(ClassTeacherController);
    for (const method of Object.getOwnPropertyNames(ClassTeacherController.prototype)) {
      const fn = ClassTeacherController.prototype[method];
      if (typeof fn !== 'function' || Reflect.getMetadata('method', fn) !== 0 || fn.length > 1) continue;
      route = `class-teacher/${Reflect.getMetadata('path', fn)}`;
      try { await classTeacher[method](fixture.classId); passed.push(route); }
      catch (error: any) { unavailable.push({ route, message: error.message }); }
    }
    if (process.env.SIDEBAR_AUDIT_REPORT === '1') {
      writeFileSync('tmp/sidebar-regression-failures.json', JSON.stringify({ failures, unavailable }, null, 2));
    }
    assert.deepEqual(schemaFailures, [], 'All owning schema initializers must succeed');
    assert.deepEqual(failures, [], 'Dashboard GET SQL must execute against the deployed schema');
    assert.ok(passed.length >= 282, 'Do not silently reduce the GET audit coverage');
    for (const failure of unavailable) {
      assert.match(failure.message, /not an active member|has not uploaded|has not been uploaded|active class-teacher appointment/, JSON.stringify(failure));
    }
    console.log('PASSED', passed.length, 'SQL FAILURES', failures.length);
  } finally { await orm.$disconnect(); await pool.end(); }
}
test('dashboard GET contracts, legacy records, and tenant isolation', { timeout: 120_000 }, main);
