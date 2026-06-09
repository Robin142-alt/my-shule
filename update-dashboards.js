const fs = require('fs');
const glob = require('fs').readdirSync('apps/web/src/components/school').filter(f => f.endsWith('.tsx'));

for (const file of glob) {
    const filePath = `apps/web/src/components/school/${file}`;
    let code = fs.readFileSync(filePath, 'utf8');
    
    let modified = false;

    if (code.includes('useSchoolMutation') && !code.includes('useQueryClient')) {
        code = code.replace('import { useSchoolMutation', 'import { useQueryClient } from "@tanstack/react-query";\nimport { useSchoolMutation');
        if (!code.includes('useQueryClient')) {
            code = code.replace('import {', 'import { useQueryClient } from "@tanstack/react-query";\nimport {');
        }
        modified = true;
    }

    if (code.includes('useSchoolMutation') && !code.includes('const queryClient = useQueryClient();')) {
        // Find the main component function and add queryClient
        code = code.replace(/export function ([A-Za-z0-9_]+)\(.*?\) {/, (match) => {
            return match + '\n  const queryClient = useQueryClient();';
        });
        modified = true;
    }

    if (code.includes('useSchoolMutation')) {
        if (code.includes('onSuccess: () => {') && !code.includes('queryClient.invalidateQueries')) {
            code = code.replace(/onSuccess: \(\) => {/g, 'onSuccess: () => {\n          queryClient.invalidateQueries();');
            modified = true;
        }
        if (code.includes('onSuccess: (data) => {') && !code.includes('queryClient.invalidateQueries')) {
            code = code.replace(/onSuccess: \(data\) => {/g, 'onSuccess: (data) => {\n          queryClient.invalidateQueries();');
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, code);
        console.log(`Updated ${file}`);
    }
}
