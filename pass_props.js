const fs = require('fs');
const path = require('path');

const filePath = path.join('apps', 'web', 'src', 'components', 'modules', 'admissions', 'admissions-module-screen.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the switch statement and add `dataset={dataset}` to all 18 workspaces.
const switchRegex = /case "([\w-]+)": return <(Admissions\w+Workspace) \/>;/g;

content = content.replace(switchRegex, (match, caseName, componentName) => {
  return `case "${caseName}": return <${componentName} dataset={dataset} />;`;
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Props successfully injected into AdmissionsModuleScreen.');
