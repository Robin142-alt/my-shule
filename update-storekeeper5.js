const fs = require('fs');
let code = fs.readFileSync('apps/web/src/components/school/storekeeper-command-center.tsx', 'utf8');

// 1. Remove them from StorekeeperCommandCenter
code = code.replace(/const { data: fetchedRequisitions } = useSchoolQuery<typeof initialRequisitions>\("\/api\/inventory\/requisitions"\);\n\s*const activeRequisitions = fetchedRequisitions \?\? initialRequisitions;\n\n\s*const { data: fetchedSuppliers } = useSchoolQuery<typeof initialSuppliers>\("\/api\/inventory\/suppliers"\);\n\s*const activeSuppliers = fetchedSuppliers \?\? initialSuppliers;\n\n\s*const { data: fetchedWaste } = useSchoolQuery<typeof initialWaste>\("\/api\/inventory\/waste"\);\n\s*const activeWaste = fetchedWaste \?\? initialWaste;\n\n\s*const { data: fetchedAuditTrail } = useSchoolQuery<typeof initialAuditTrail>\("\/api\/inventory\/audit"\);\n\s*const activeAuditTrail = fetchedAuditTrail \?\? initialAuditTrail;\n\n\s*const { data: fetchedAiInsights } = useSchoolQuery<typeof initialAiInsights>\("\/api\/inventory\/insights"\);\n\s*const activeAiInsights = fetchedAiInsights \?\? initialAiInsights;/g, '');

// 2. Add them inside the respective functions
code = code.replace(/function RequisitionPanel\(\{ theme \}: \{ theme: StorekeeperTheme \}\) \{/, 'function RequisitionPanel({ theme }: { theme: StorekeeperTheme }) {\n  const { data: fetchedRequisitions } = useSchoolQuery<typeof initialRequisitions>("/api/inventory/requisitions");\n  const activeRequisitions = fetchedRequisitions ?? initialRequisitions;');

code = code.replace(/function SupplierPerformance\(\{ theme \}: \{ theme: StorekeeperTheme \}\) \{/, 'function SupplierPerformance({ theme }: { theme: StorekeeperTheme }) {\n  const { data: fetchedSuppliers } = useSchoolQuery<typeof initialSuppliers>("/api/inventory/suppliers");\n  const activeSuppliers = fetchedSuppliers ?? initialSuppliers;');

code = code.replace(/function WastePanel\(\{ theme \}: \{ theme: StorekeeperTheme \}\) \{/, 'function WastePanel({ theme }: { theme: StorekeeperTheme }) {\n  const { data: fetchedWaste } = useSchoolQuery<typeof initialWaste>("/api/inventory/waste");\n  const activeWaste = fetchedWaste ?? initialWaste;');

code = code.replace(/function AuditPanel\(\{ theme \}: \{ theme: StorekeeperTheme \}\) \{/, 'function AuditPanel({ theme }: { theme: StorekeeperTheme }) {\n  const { data: fetchedAuditTrail } = useSchoolQuery<typeof initialAuditTrail>("/api/inventory/audit");\n  const activeAuditTrail = fetchedAuditTrail ?? initialAuditTrail;');

code = code.replace(/function AiInsights\(\{ theme \}: \{ theme: StorekeeperTheme \}\) \{/, 'function AiInsights({ theme }: { theme: StorekeeperTheme }) {\n  const { data: fetchedAiInsights } = useSchoolQuery<typeof initialAiInsights>("/api/inventory/insights");\n  const activeAiInsights = fetchedAiInsights ?? initialAiInsights;');

fs.writeFileSync('apps/web/src/components/school/storekeeper-command-center.tsx', code);
