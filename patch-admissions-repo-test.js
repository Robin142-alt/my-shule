const fs = require('fs');

const file = 'apps/api/src/modules/admissions/admissions.test.ts';
let content = fs.readFileSync(file, 'utf8');

const oldStr = `  const repository = new AdmissionsRepository({
    query: async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      return { rows: [] };
    },
  } as never);`;

const newStr = `  const repository = new AdmissionsRepository({
    executeWithTenant: async (tenantId: string, userId: string | null, cb: any) => {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          calls.push({ sql, params });
          return [];
        },
      });
    },
  } as never);`;

content = content.replace(oldStr, newStr);
fs.writeFileSync(file, content, 'utf8');
console.log('patched admissions repo test');
