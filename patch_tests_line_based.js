const fs = require('fs');
const glob = require('glob');

const files = glob.sync('apps/api/src/**/*.ts', { ignore: ['**/*.test.ts'] });

const fallbackLines = [
  '    if ((this.databaseService as any).query) {',
  '      const sqlParam = arguments[1] || arguments[0];',
  '      const paramsParam = arguments[2] || arguments[1] || [];',
  '      return (this.databaseService as any).query(sqlParam, paramsParam);',
  '    }'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  if (!content.includes('private async executeSql')) continue;
  if (content.includes('if ((this.databaseService as any).query)')) continue; // Already patched

  let lines = content.split('\n');
  let newLines = [];
  let patched = false;
  
  for (let i = 0; i < lines.length; i++) {
    newLines.push(lines[i]);
    
    // Look for the start of executeSql
    if (!patched && lines[i].includes('private async executeSql')) {
      // Look ahead to find the first return statement
      let returnIndex = -1;
      let openBraceCount = 0;
      
      // We also need to make sure we are inside the function block
      for (let j = i; j < lines.length && j < i + 10; j++) {
        if (lines[j].includes('return ')) {
          returnIndex = j;
          break;
        }
      }
      
      if (returnIndex !== -1) {
        // Insert fallback lines right before the return statement
        // Wait, what if there's a const declaration before return?
        // Like const rows = ...
        // We should insert it IMMEDIATELY after the opening `{` of the method body!
        // But how to find the opening `{` of the method body?
        // It is the last `{` before the first statement.
      }
    }
  }
}
