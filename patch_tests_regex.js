const fs = require('fs');
const glob = require('glob');

const files = glob.sync('apps/api/src/**/*.ts', { ignore: ['**/*.test.ts'] });

const fallback = `if ((this.databaseService as any).query) { return (this.databaseService as any).query(arguments[1] || arguments[0], arguments[2] || arguments[1] || []); }\n$2`;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  if (!content.includes('private async executeSql')) continue;
  
  // We want to patch executeSql, executeSqlTx, executeSqlGlobal, etc.
  // Actually, we can just replace the first return or const rows inside EACH function!
  // But wait, there might be multiple executeSql functions in one file!
  // We can use a replacer function.

  const regex = /(private async executeSql[a-zA-Z]*[\s\S]*?\{[\s]*?\n)([ \t]*)(return |const rows = |const firstParam = )/g;
  
  const newContent = content.replace(regex, (match, p1, p2, p3) => {
    // If it already has the query fallback, skip
    if (match.includes('.query(')) return match;
    
    return `${p1}${p2}if ((this.databaseService as any).query) { return (this.databaseService as any).query(arguments[1] || arguments[0], arguments[2] || arguments[1] || []); }\n${p2}${p3}`;
  });

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf-8');
    console.log(`Patched ${file}`);
  }
}
