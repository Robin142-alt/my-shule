const fs = require('fs');
const glob = require('glob');

const files = glob.sync('apps/api/src/**/*.ts', { ignore: ['**/*.test.ts'] });

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let originalContent = content;

  // We want to patch executeSql to include the .query fallback if it's missing
  // Original is usually:
  // private async executeSql<T = any>(tenantId: string, sql: string, params: any[]): Promise<T[]> {
  //   return (this.databaseService as any).executeWithTenant(
  
  if (content.includes('private async executeSql') && !content.includes('.query(')) {
    // Find the opening brace of executeSql
    const startIndex = content.indexOf('private async executeSql');
    const braceIndex = content.indexOf('{', startIndex);
    
    if (braceIndex !== -1) {
      // Check if it's returning something immediately after the brace
      // We will insert the fallback right after the opening brace
      const fallback = `\n    if ((this.databaseService as any).query) {\n      const sqlParam = arguments[1] || arguments[0];\n      const paramsParam = arguments[2] || arguments[1] || [];\n      return (this.databaseService as any).query(sqlParam, paramsParam);\n    }`;
      
      content = content.substring(0, braceIndex + 1) + fallback + content.substring(braceIndex + 1);
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Patched fallback in ${file}`);
  }
}
