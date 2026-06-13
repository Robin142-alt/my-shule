const fs = require('fs');

const glob = require('glob');
const files = glob.sync('apps/api/src/modules/**/*.test.ts');

const insertion = `    executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
`;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('executeWithTenant: async function(tenantId: string')) continue;

  let modified = false;
  const patchedContent = content.replace(
    /query:\s*async\s*\(/g,
    (match) => {
      modified = true;
      return insertion + match;
    }
  );

  if (modified) {
    fs.writeFileSync(file, patchedContent, 'utf8');
  }
}
