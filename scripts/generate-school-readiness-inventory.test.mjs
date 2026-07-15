import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const rootDir = process.cwd();

test("generates school readiness capability matrix and manual verification scripts", () => {
  execFileSync(process.execPath, ["scripts/generate-school-readiness-inventory.mjs"], {
    cwd: rootDir,
    stdio: "pipe",
  });

  const matrix = readFileSync(join(rootDir, "docs", "SCHOOL_CAPABILITY_MATRIX.md"), "utf8");
  const manualScripts = readFileSync(
    join(rootDir, "docs", "MANUAL_GMAIL_VERIFICATION_SCRIPTS.md"),
    "utf8",
  );

  assert.match(matrix, /# MyShule School Capability Matrix/);
  assert.match(matrix, /## Role Dashboard Inventory/);
  assert.match(matrix, /principal-command-center\.tsx/);
  assert.match(matrix, /## Role Sidebar And Workspace Inventory/);
  assert.match(matrix, /Principal \| Overview \| overview/);
  assert.match(matrix, /Teacher \| Exams & Marks \| exams-marks/);
  assert.match(matrix, /Exams Manager \| Publishing \| publishing/);
  assert.match(matrix, /Admissions Dashboard \| Enquiries \| enquiries/);
  assert.match(matrix, /## Frontend Route Section Inventory/);
  assert.match(matrix, /admissionsDashboardSectionIds/);
  assert.match(matrix, /teacherDashboardSectionIds/);
  assert.match(matrix, /examsManagerDashboardSectionIds/);
  assert.match(matrix, /## API Controller Inventory/);
  assert.match(matrix, /## Database Model Tenant-Scope Inventory/);
  assert.match(matrix, /## Activation Dependency Graph/);
  assert.match(matrix, /NOT_YET_MANUALLY_VERIFIED/);

  assert.match(manualScripts, /# Manual Gmail Verification Scripts/);
  assert.match(manualScripts, /## School Creation And Principal Activation/);
  assert.match(manualScripts, /- Account: /);
  assert.match(manualScripts, /- Invitation sender: /);
  assert.match(manualScripts, /- Expected email subject: /);
  assert.match(manualScripts, /- Expected invitation link: /);
  assert.match(manualScripts, /- Login route: /);
  assert.match(manualScripts, /- Dashboard: /);
  assert.match(manualScripts, /- Receiving role: /);
  assert.match(manualScripts, /- Expected audit event: /);
  assert.match(manualScripts, /- Screenshot checkpoints: /);
  assert.match(manualScripts, /- Pass\/fail: NOT_YET_MANUALLY_VERIFIED/);
  assert.match(manualScripts, /- Notes: /);
  assert.match(manualScripts, /- Defect: /);
  assert.match(manualScripts, /## Staff Invitation And Acceptance/);
  assert.match(manualScripts, /## Admissions To Student Activation/);
  assert.match(manualScripts, /## Exams, Marks, Report Cards, And Publication/);
  assert.match(manualScripts, /## Cross-Tenant Denial And Clean School Data/);
});
