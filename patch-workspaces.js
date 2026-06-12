const fs = require('fs');
const path = require('path');
const dir = 'apps/web/src/components/school/class-teacher/workspaces';

fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.tsx')) {
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace(/\{data\.map\(\(([\w]+): any\)/g, '{(Array.isArray(data) ? data : []).map(($1: any)');
    fs.writeFileSync(fullPath, content);
    console.log(`Patched ${file}`);
  }
});
