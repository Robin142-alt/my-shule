const fs = require('fs');
const glob = require('glob');

const files = glob.sync('apps/api/src/**/*.ts', { ignore: ['**/*.test.ts'] });

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  
  if (content.includes('private async executeSql')) {
    // Check if there are any calls to this.executeSql
    // But wait, what if executeSql is used? 
    // Wait, it's safer to just replace `(this.databaseService as any)` with `(this.db as any)` OR whatever it injects!
    // But why keep executeSql if it's unused?
    const hasCall = /this\.executeSql\(/.test(content);
    if (!hasCall) {
      // Find the start of executeSql
      const match = /^\s*private async executeSql<T = any>\(.*?\}\s*$/sm.exec(content);
      // Wait, regex for the whole block is tricky because of nested braces.
      // Let's just remove the standard executeSql we injected!
      const executeSqlRegex = /[ \t]*private async executeSql<T = any>\(.*?\) \{\s*if \(\(this\.databaseService as any\)\.query\) \{\s*const sqlParam = arguments\[1\] \|\| arguments\[0\];\s*const paramsParam = arguments\[2\] \|\| arguments\[1\] \|\| \[\];\s*return \(\(this\.databaseService as any\)\.query\(sqlParam, paramsParam\);\s*\}\s*if \(isUuid\) \{\s*return \(\(this\.databaseService as any\)\.executeWithTenant\(firstParam, null, async \(tx: any\) => \{\s*const result = await tx\.\$queryRawUnsafe\(query, \.\.\.params\);\s*const arr = Array\.isArray\(result\) \? result : \[result\];\s*return \{ rows: arr, rowCount: arr\.length \};\s*\}\);\s*\} else \{\s*const result = await \(\(this\.databaseService as any\)\.\$queryRawUnsafe\(query, \.\.\.params\);\s*const arr = Array\.isArray\(result\) \? result : \[result\];\s*return \{ rows: arr, rowCount: arr\.length \};\s*\}\s*\}/s;
      
      const newContent = content.replace(executeSqlRegex, '');
      if (newContent !== content) {
        fs.writeFileSync(file, newContent, 'utf-8');
        console.log(`Removed unused executeSql from ${file}`);
      } else {
        // Try alternate regex
        const altRegex = /[ \t]*private async executeSql.*?return \{ rows: Array\.isArray\(rows\) \? rows : \[rows\] \};\s*\}\);\s*\}/s;
        const newContent2 = content.replace(altRegex, '');
        if (newContent2 !== content) {
          fs.writeFileSync(file, newContent2, 'utf-8');
          console.log(`Removed unused executeSql (alt) from ${file}`);
        } else {
            console.log(`Unused executeSql present but regex failed to match in ${file}`);
        }
      }
    }
  }
}
