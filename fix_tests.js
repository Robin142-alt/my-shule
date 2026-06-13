const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.test.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const regex = /(\s+)query:\s*async\s*\(/g;
      
      let newContent = content.replace(regex, (match, whitespace) => {
        return `${whitespace}executeWithTenant: async function (tenantId: string, userId: string | null, cb: any) {
${whitespace}  const tx = {
${whitespace}    $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
${whitespace}      if (typeof (this as any).query === 'function') {
${whitespace}        const res = await (this as any).query(sql, params);
${whitespace}        return Array.isArray(res?.rows) ? res.rows : (Array.isArray(res) ? res : [res]);
${whitespace}      }
${whitespace}      return [];
${whitespace}    }
${whitespace}  };
${whitespace}  const result = await cb(tx);
${whitespace}  if (result && typeof result === 'object' && Array.isArray(result.rows)) {
${whitespace}    return result;
${whitespace}  }
${whitespace}  return { rows: Array.isArray(result) ? result : [result] };
${whitespace}},${match}`;
      });
      
      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'apps/api/src'));
