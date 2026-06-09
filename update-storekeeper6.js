const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/school/storekeeper-command-center.tsx', 'utf8');

code = code.replace(/function RequisitionPanel\(\{ theme \}: \{ theme: StorekeeperTheme \}\) \{\n  const \{ data: fetchedRequisitions \} = useSchoolQuery<typeof initialRequisitions>\("\/api\/inventory\/requisitions"\);\n  const activeRequisitions = fetchedRequisitions \?\? initialRequisitions;/, 'function RequisitionPanel({ theme }: { theme: StorekeeperTheme }) {\n  const { data: fetchedRequisitions } = useSchoolQuery<typeof initialRequisitions>("/api/inventory/requisitions");\n  const activeRequisitions = fetchedRequisitions ?? initialRequisitions;\n  const queryClient = useQueryClient();');

fs.writeFileSync('apps/web/src/components/school/storekeeper-command-center.tsx', code);
