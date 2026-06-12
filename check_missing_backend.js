const fs = require('fs');
const path = require('path');

const definitionsStr = fs.readFileSync('apps/web/src/lib/operational/generated-workspace-definitions.ts', 'utf8');

// Use regex to extract all workflow bindings
const workflowRegex = /workflowBinding:\s*['"]([^'"]+)['"]/g;
const bindings = new Set();
let match;

while ((match = workflowRegex.exec(definitionsStr)) !== null) {
  bindings.add(match[1]);
}

console.log(`Found ${bindings.size} unique workflow bindings in frontend definitions.`);

// Check if these bindings exist in the backend
const { execSync } = require('child_process');

let missingCount = 0;
let foundCount = 0;
const missingBindings = [];

for (const binding of bindings) {
  try {
    // Grep the backend for the binding
    const output = execSync(`grep -r "${binding}" apps/api/src || true`, { encoding: 'utf8' });
    if (output.trim() === '') {
      missingBindings.push(binding);
      missingCount++;
    } else {
      foundCount++;
    }
  } catch (e) {
    missingBindings.push(binding);
    missingCount++;
  }
}

console.log(`Found in backend: ${foundCount}`);
console.log(`Missing in backend: ${missingCount}`);
console.log('Top 20 missing bindings:', missingBindings.slice(0, 20));
