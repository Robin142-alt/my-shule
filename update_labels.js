const fs = require('fs');

let schoolCode = fs.readFileSync('apps/web/src/lib/experiences/school-data.ts', 'utf-8');

// Extract all id/label pairs from schoolNavMap
const navMapMatch = schoolCode.match(/const schoolNavMap[\s\S]*?};/);
if (!navMapMatch) {
    console.error("Could not find schoolNavMap");
    process.exit(1);
}

const navMapStr = navMapMatch[0];
const idLabels = {};

const regex = /\{ id: ["']([^"']+)["'], label: ["']([^"']+)["']/g;
let match;
while ((match = regex.exec(navMapStr)) !== null) {
    idLabels[match[1]] = match[2];
}

// Add the original ones back so we don't lose support tickets etc
const originalLabelsMatch = schoolCode.match(/export const schoolSectionLabels: Record<string, string> = \{([\s\S]*?)\};/);
if (originalLabelsMatch) {
    const origRegex = /["']?([a-zA-Z0-9-]+)["']?:\s*["']([^"']+)["']/g;
    let m2;
    while ((m2 = origRegex.exec(originalLabelsMatch[1])) !== null) {
        idLabels[m2[1]] = m2[2];
    }
}

// Rebuild the string
let newSectionLabels = "export const schoolSectionLabels: Record<string, string> = {\n";
for (const [id, label] of Object.entries(idLabels)) {
    // Escape quotes if needed
    let safeId = id.includes('-') ? `"${id}"` : id;
    newSectionLabels += `  ${safeId}: "${label}",\n`;
}
newSectionLabels += "};";

schoolCode = schoolCode.replace(/export const schoolSectionLabels: Record<string, string> = \{[\s\S]*?\};/, newSectionLabels);

fs.writeFileSync('apps/web/src/lib/experiences/school-data.ts', schoolCode);
console.log('Successfully updated schoolSectionLabels');
