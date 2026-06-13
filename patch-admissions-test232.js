const fs = require('fs');

const file = 'apps/api/src/modules/admissions/admissions.test.ts';
let content = fs.readFileSync(file, 'utf8');

const match = "  const repository = new AdmissionsRepository({\r\n    query: async (sql: string, params: unknown[]) => {\r\n      calls.push({ sql, params });\r\n      return { rows: [] };\r\n    },\r\n  } as never);";
const replace = `  const repository = new AdmissionsRepository({
    executeWithTenant: async (tenantId: string, userId: string | null, cb: any) => {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          calls.push({ sql, params });
          return [];
        },
      });
    },
  } as never);`;

if (content.includes(match)) {
    content = content.replace(match, replace);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Successfully patched test 232 in admissions.test.ts');
} else {
    console.log('Match not found for test 232 patch!');
}
