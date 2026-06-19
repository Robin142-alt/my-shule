const fs = require('fs');
const path = require('path');

const resultsFile = path.join(__dirname, 'scan_results.json');
const analysisFile = path.join(__dirname, 'analysis.md');
const handoffFile = path.join(__dirname, 'handoff.md');

if (!fs.existsSync(resultsFile)) {
  console.error('scan_results.json not found! Run scanner.js first.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
const { totalScanned, totalPlaceholders, placeholders, grouped } = data;

// 1. Generate analysis.md
let analysisContent = `# Placeholder Workspaces Analysis Report

## Summary
- **Total Workspace Files Scanned**: ${totalScanned}
- **Placeholder Workspaces Identified (rendering \`DocxOperationalWorkspace\`)**: ${totalPlaceholders}

This report compiles all workspace files under \`apps/web/src/components/school\` that act as placeholders by rendering \`DocxOperationalWorkspace\`. It groups them by role directory, evaluates if they are defined in \`generated-workspace-definitions.ts\`, and checks for corresponding backend references in \`apps/api/src\`.

---

## Detailed Findings by Role

`;

for (const [role, files] of Object.entries(grouped)) {
  analysisContent += `### Role: \`${role}\`\n\n`;
  analysisContent += `| File Name | Module ID | Definition Status | Backend Status | Refs |\n`;
  analysisContent += `| :--- | :--- | :--- | :--- | :--- |\n`;
  
  files.forEach(f => {
    const defStatus = f.hasDefinition ? `✅ Found (${f.definitionTitle})` : '❌ Missing';
    const backendStatus = f.backendStatus === 'Referenced' ? `✅ Referenced (${f.backendMatches.length} refs)` : '❌ Missing';
    // Summarize backend references (max 3 files)
    const refFiles = [...new Set(f.backendMatches.map(m => m.file))];
    const refSummary = refFiles.length > 0 ? refFiles.slice(0, 3).map(rf => `\`${path.basename(rf)}\``).join(', ') + (refFiles.length > 3 ? '...' : '') : 'None';
    
    analysisContent += `| \`${f.filename}\` | \`${f.moduleId}\` | ${defStatus} | ${backendStatus} | ${refSummary} |\n`;
  });
  analysisContent += '\n';
  
  // Add a details block for backend references
  analysisContent += `#### Backend Reference Details for \`${role}\`:\n`;
  files.forEach(f => {
    if (f.backendMatches && f.backendMatches.length > 0) {
      analysisContent += `- **\`${f.filename}\` (\`${f.moduleId}\`)**:\n`;
      const uniqueRefs = {};
      f.backendMatches.forEach(m => {
        if (!uniqueRefs[m.file]) uniqueRefs[m.file] = [];
        if (uniqueRefs[m.file].length < 2) { // Limit to 2 lines per file to keep it readable
          uniqueRefs[m.file].push(m);
        }
      });
      for (const [file, matches] of Object.entries(uniqueRefs)) {
        analysisContent += `  - \`${file}\`:\n`;
        matches.forEach(m => {
          analysisContent += `    - Line ${m.line}: \`${m.content}\`\n`;
        });
      }
    } else {
      analysisContent += `- **\`${f.filename}\` (\`${f.moduleId}\`)**: No backend references found in \`apps/api/src\`.\n`;
    }
  });
  analysisContent += '\n---\n\n';
}

fs.writeFileSync(analysisFile, analysisContent, 'utf8');
console.log('analysis.md generated successfully.');


// 2. Generate handoff.md
let handoffContent = `# Handoff Report — Codebase Placeholder Workspaces

## 1. Observation
We recursively scanned the \`apps/web/src/components/school\` directory and identified the following:
- **Total scanned workspace files**: ${totalScanned}
- **Placeholder workspace files** (rendering \`DocxOperationalWorkspace\`): ${totalPlaceholders}

These placeholder files are grouped by role directory as follows:

`;

for (const [role, files] of Object.entries(grouped)) {
  handoffContent += `### Role: \`${role}\` (${files.length} placeholder files)\n`;
  files.forEach(f => {
    const def = f.hasDefinition ? `Definition: ✅ Found (\`${f.moduleId}\`)` : `Definition: ❌ Missing (\`${f.moduleId}\`)`;
    const backend = f.backendStatus === 'Referenced' ? `Backend: ✅ Referenced` : `Backend: ❌ Missing`;
    handoffContent += `- \`apps/web/src/components/school/${role}/${f.filename}\` -> ${def} | ${backend}\n`;
  });
  handoffContent += '\n';
}

handoffContent += `
## 2. Logic Chain
1. We scanned all \`*-workspace.tsx\` files in the school components directory. Any file rendering \`DocxOperationalWorkspace\` is confirmed as a placeholder, since that component renders a mock operational dashboard based on JSON contracts.
2. We checked if the \`moduleId\` provided in \`DocxOperationalWorkspace\` exists as a contract definition in \`apps/web/src/lib/operational/generated-workspace-definitions.ts\`. Most have definitions (e.g. \`admissions\`, \`boarding-attendance\`), but some return \`undefined\` or fallback to the generic first definition because the \`moduleId\` is mismatching or not defined.
3. We checked the NestJS API backend (\`apps/api/src\`) for references to the \`moduleId\`. 
   - Workflows with established domain modules (like \`admissions\`, \`attendance\`, \`finance-overview\`, \`discipline\`, \`students\`, \`items\`, \`suppliers\`, \`routes\`, \`vehicles\`) have substantial backend coverage (entities, controllers, database tables, modules).
   - In contrast, several workspace bindings (like \`parent-linking\`, \`boarding-attendance\`, \`leave-exit\`, \`rooms-beds\`, \`class-academics\`, \`discipline-follow-up\`, \`learner-profiles\`, \`parent-contacts\`, \`welfare-notes\`, \`curriculum-coverage\`, \`lesson-plans\`, \`teacher-workload\`, \`exam-setup\`, \`exam-timetable\`, \`follow-ups\`, \`quotations\`, \`calls-log\`, \`letters-documents\`, \`parent-messages\`, \`reception-queue\`, \`student-clearance\`, \`gate-register\`, \`staff-movement\`, \`student-exit-passes\`, \`damaged-missing\`, \`fuel-maintenance\`, \`student-transport-list\`) have **no references** in the NestJS backend API, representing missing workflow bindings or domains that have not been implemented.

## 3. Caveats
- Backend checks are based on searching for the \`moduleId\` string in the \`apps/api/src\` directory. There could be indirect mappings (e.g., mapped to database tables with slightly different names), though typically the domain ID is standard.
- Mismatched or missing definitions indicate areas where the operational blueprints are not aligned with the frontend workspace files.

## 4. Conclusion
Out of ${totalPlaceholders} placeholder workspaces:
- Several have solid backend foundations (database schemas, controllers) but are awaiting real frontend UI implementation to replace the \`DocxOperationalWorkspace\` mock component.
- Many workspaces represent completely unimplemented workflows with **no matching backend logic** or controller bindings. These require backend scaffolding (controllers, services, entities, DTOs, migrations) as well as frontend UI.

## 5. Verification Method
- To verify the list of placeholder files, run:
  \`\`\`powershell
  Get-ChildItem -Path "apps/web/src/components/school" -Recurse -Filter "*-workspace.tsx" | Select-String -Pattern "DocxOperationalWorkspace"
  \`\`\`
- To verify definition status, look up the corresponding \`moduleId\` in \`apps/web/src/lib/operational/generated-workspace-definitions.ts\`.
- To verify backend reference status, run:
  \`\`\`powershell
  git grep "<moduleId>" apps/api/src
  \`\`\`
`;

fs.writeFileSync(handoffFile, handoffContent, 'utf8');
console.log('handoff.md generated successfully.');
