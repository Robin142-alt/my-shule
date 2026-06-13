const fs = require('fs');
const glob = require('glob');

const files = glob.sync('apps/api/src/**/*.ts', { ignore: ['**/*.test.ts'] });

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let originalContent = content;

  const functionNames = ['executeSql', 'executeSqlTx', 'executeSqlGlobal'];

  for (const fn of functionNames) {
    if (content.includes(`private async ${fn}`)) {
      const callMatch = new RegExp(`this\\.${fn}\\(`, 'g');
      if (!callMatch.test(content)) {
        // Find the start of the function
        const fnPattern = new RegExp(`[ \\t]*private async ${fn}(?:<[^>]*>)?\\([\\s\\S]*?\\)\\s*:\\s*Promise<[\\s\\S]*?>\\s*\\{`, 'g');
        let match;
        // There could be multiple occurrences, though usually just one
        while ((match = fnPattern.exec(content)) !== null) {
          const startIndex = match.index;
          const braceIndex = startIndex + match[0].length - 1;
          if (content[braceIndex] !== '{') {
            console.error(`Brace match failed for ${fn} in ${file}`);
            continue;
          }

          let braceCount = 1;
          let endIndex = braceIndex + 1;
          while (endIndex < content.length && braceCount > 0) {
            if (content[endIndex] === '{') braceCount++;
            else if (content[endIndex] === '}') braceCount--;
            endIndex++;
          }

          if (braceCount === 0) {
            // Remove trailing newlines up to 2
            let removedWhitespace = 0;
            while (endIndex < content.length && (content[endIndex] === '\n' || content[endIndex] === '\r')) {
              endIndex++;
              removedWhitespace++;
              if (removedWhitespace > 2) break;
            }
            content = content.substring(0, startIndex) + content.substring(endIndex);
            console.log(`Removed unused ${fn} from ${file}`);
            
            // Adjust regex index since string length changed
            fnPattern.lastIndex = startIndex;
          }
        }
      }
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf-8');
  }
}
