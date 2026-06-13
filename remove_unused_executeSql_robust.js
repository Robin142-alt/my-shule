const fs = require('fs');
const glob = require('glob');

const files = glob.sync('apps/api/src/**/*.ts', { ignore: ['**/*.test.ts'] });

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  
  if (content.includes('private async executeSql')) {
    const hasCall = /this\.executeSql\(/.test(content);
    if (!hasCall) {
      let startIndex = content.indexOf('private async executeSql');
      // find the opening brace
      let braceIndex = content.indexOf('{', startIndex);
      if (braceIndex === -1) continue;

      let braceCount = 1;
      let endIndex = braceIndex + 1;
      while (endIndex < content.length && braceCount > 0) {
        if (content[endIndex] === '{') braceCount++;
        else if (content[endIndex] === '}') braceCount--;
        endIndex++;
      }

      if (braceCount === 0) {
        // Also remove leading whitespace
        let actualStart = startIndex;
        while (actualStart > 0 && (content[actualStart - 1] === ' ' || content[actualStart - 1] === '\t')) {
          actualStart--;
        }
        
        // Remove trailing newlines
        while (endIndex < content.length && (content[endIndex] === '\n' || content[endIndex] === '\r')) {
          endIndex++;
        }

        const newContent = content.substring(0, actualStart) + content.substring(endIndex);
        fs.writeFileSync(file, newContent, 'utf-8');
        console.log(`Removed unused executeSql from ${file}`);
      }
    }
  }
}
