const fs = require('fs');
const path = 'c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school';

const lines = fs.readFileSync(path + '/school-pages.tsx', 'utf8').split('\n');

const studentsPage = lines.slice(895, 1135).join('\n').replace('function SchoolStudentsPage', 'export function SchoolStudentsPage');
const academicsPage = lines.slice(3087, 3215).join('\n').replace('function SchoolAcademicsPage', 'export function SchoolAcademicsPage');
const reportsPage = lines.slice(3216, 3308).join('\n').replace('function SchoolReportsPage', 'export function SchoolReportsPage');

const imports = `"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { SchoolPageHeader } from "@/components/school/school-page-header";
import { MetricGrid } from "@/components/school/metric-grid";
import { StatusPill } from "@/components/school/status-pill";
import { getSchoolWorkspace } from "@/lib/experiences/school-data";
import type { SchoolExperienceRole } from "@/lib/auth/roles";
import type { SchoolRouteMode } from "@/components/school/school-finance-page";
`;

const studentsImports = imports + `import { getMissingFieldError } from "@/lib/forms/validation";\n\n`;

fs.writeFileSync(path + '/student-directory-workspace.tsx', studentsImports + studentsPage);
fs.writeFileSync(path + '/academics-workspace-admin.tsx', imports + academicsPage);
fs.writeFileSync(path + '/reports-workspace.tsx', imports + reportsPage);

console.log('Extracted files.');
