const fs = require('fs');

let text = fs.readFileSync('apps/web/src/lib/experiences/school-data.ts', 'utf-8');

// Fix type
text = text.replace('Record<SchoolExperienceRole, ExperienceNavItem[]>', 'Record<SchoolExperienceRole | PortalViewer, ExperienceNavItem[]>');

// Ensure import includes PortalViewer
if (!text.includes('PortalViewer')) {
    text = text.replace(/SchoolExperienceRole,/, 'SchoolExperienceRole, PortalViewer,');
}

// Re-generate schoolSectionLabels correctly to avoid duplicates
const match = text.match(/export const schoolSectionLabels: Record<string, string> = \{([\s\S]*?)function buildSchoolProfile/);
if (match) {
    let oldObjContent = match[1];
    
    // We can just clean it up using a Set of keys
    const lines = oldObjContent.split('\n');
    const uniqueKeys = new Set();
    const cleanLines = [];
    
    for (const line of lines) {
        if (!line.trim()) continue;
        if (line.includes('};')) continue;
        
        const keyMatch = line.match(/^\s*(?:\"([^"]+)\"|([a-zA-Z0-9_-]+))\s*:/);
        if (keyMatch) {
            const key = keyMatch[1] || keyMatch[2];
            if (!uniqueKeys.has(key)) {
                uniqueKeys.add(key);
                cleanLines.push(line);
            }
        } else {
            cleanLines.push(line);
        }
    }
    
    const newObjContent = 'export const schoolSectionLabels: Record<string, string> = {\n' + cleanLines.join('\n') + '\n};\n\nfunction buildSchoolProfile';
    text = text.replace(/export const schoolSectionLabels: Record<string, string> = \{[\s\S]*?function buildSchoolProfile/, newObjContent);
}

fs.writeFileSync('apps/web/src/lib/experiences/school-data.ts', text, 'utf-8');
console.log('Fixed types and duplicates in school-data.ts');
