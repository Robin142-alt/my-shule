const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/school/storekeeper-command-center.tsx', 'utf8');

const replaceArray = (name, endpoint) => {
    code = code.replace(`const ${name} = [`, `const initial${name.charAt(0).toUpperCase() + name.slice(1)} = [`);
    
    // add hook
    code = code.replace('const searchResults = useMemo(() => {', `const { data: fetched${name.charAt(0).toUpperCase() + name.slice(1)} } = useSchoolQuery<typeof initial${name.charAt(0).toUpperCase() + name.slice(1)}>("${endpoint}");\n  const active${name.charAt(0).toUpperCase() + name.slice(1)} = fetched${name.charAt(0).toUpperCase() + name.slice(1)} ?? initial${name.charAt(0).toUpperCase() + name.slice(1)};\n\n  const searchResults = useMemo(() => {`);

    // replace map
    code = code.replace(new RegExp(`${name}\\.map`, 'g'), `active${name.charAt(0).toUpperCase() + name.slice(1)}.map`);
};

replaceArray('suppliers', '/api/inventory/suppliers');
replaceArray('waste', '/api/inventory/waste');
replaceArray('auditTrail', '/api/inventory/audit');
replaceArray('aiInsights', '/api/inventory/insights');

fs.writeFileSync('apps/web/src/components/school/storekeeper-command-center.tsx', code);
