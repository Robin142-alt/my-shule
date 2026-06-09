const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/school/storekeeper-command-center.tsx', 'utf8');

code = code.replace('const requisitions = [', 'const initialRequisitions = [');

code = code.replace(/function recordBulkApprovalReview\(\) \{/, 'function recordBulkApprovalReview(requisitions: typeof initialRequisitions) {');
code = code.replace(/function recordUrgencyFilterOpened\(\) \{/, 'function recordUrgencyFilterOpened(requisitions: typeof initialRequisitions) {');

code = code.replace(/recordBulkApprovalReview\(\)/g, 'recordBulkApprovalReview(activeRequisitions)');
code = code.replace(/recordUrgencyFilterOpened\(\)/g, 'recordUrgencyFilterOpened(activeRequisitions)');

code = code.replace(/handleRequisitionDecision\(req: \(typeof requisitions\)\[number\], decision:/g, 'handleRequisitionDecision(req: (typeof initialRequisitions)[number], decision:');

// Add the fetch
code = code.replace(/const searchResults = useMemo\(\(\) => \{/, 'const { data: fetchedRequisitions } = useSchoolQuery<typeof initialRequisitions>("/api/inventory/requisitions");\n  const activeRequisitions = fetchedRequisitions ?? initialRequisitions;\n\n  const searchResults = useMemo(() => {');

// Rename map in component
code = code.replace(/requisitions\.map\(\(req\) => \(/g, 'activeRequisitions.map((req) => (');

fs.writeFileSync('apps/web/src/components/school/storekeeper-command-center.tsx', code);
console.log('storekeeper updated');
