const fs = require('fs');

let sd = fs.readFileSync('apps/web/src/lib/experiences/school-data.ts', 'utf-8');

const replacement = `  "procurement-officer": [
    { id: "overview", label: "Overview", href: toSchoolPath("overview"), icon: LayoutGrid },
    { id: "purchase-requests", label: "Purchase Requests", href: toSchoolPath("purchase-requests"), icon: ClipboardList },
    { id: "suppliers", label: "Suppliers", href: toSchoolPath("suppliers"), icon: Users },
    { id: "quotations", label: "Quotations", href: toSchoolPath("quotations"), icon: FileSpreadsheet },
    { id: "purchase-orders", label: "Purchase Orders", href: toSchoolPath("purchase-orders"), icon: ClipboardList },
    { id: "deliveries", label: "Deliveries", href: toSchoolPath("deliveries"), icon: BusFront },
    { id: "reports", label: "Reports", href: toSchoolPath("reports"), icon: FileSpreadsheet },
    ...supportSidebarItems,
  ],`;

sd = sd.replace(/"procurement-officer": \[\s*\{\s*id:\s*"overview"[\s\S]*?\.\.\.supportSidebarItems,\s*\],/, replacement);

fs.writeFileSync('apps/web/src/lib/experiences/school-data.ts', sd, 'utf-8');

let sa = fs.readFileSync('apps/web/src/lib/experiences/superadmin-data.ts', 'utf-8');
if (!sa.includes('"purchase-requests"')) {
    sa = sa.replace(/export const superadminSectionLabels: Record<string, string> = {/, 
    `export const superadminSectionLabels: Record<string, string> = {
  "purchase-requests": "Purchase Requests",
  "suppliers": "Suppliers",
  "quotations": "Quotations",
  "purchase-orders": "Purchase Orders",
  "deliveries": "Deliveries",`);
    fs.writeFileSync('apps/web/src/lib/experiences/superadmin-data.ts', sa, 'utf-8');
}

let sdLabels = fs.readFileSync('apps/web/src/lib/experiences/school-data.ts', 'utf-8');
if (!sdLabels.includes('"purchase-requests"')) {
    sdLabels = sdLabels.replace(/export const schoolSectionLabels: Record<string, string> = {/, 
    `export const schoolSectionLabels: Record<string, string> = {
  "purchase-requests": "Purchase Requests",
  "suppliers": "Suppliers",
  "quotations": "Quotations",
  "purchase-orders": "Purchase Orders",
  "deliveries": "Deliveries",`);
    fs.writeFileSync('apps/web/src/lib/experiences/school-data.ts', sdLabels, 'utf-8');
}
console.log('Fixed procurement-officer sidebar');
