import fs from "node:fs";
import path from "node:path";

import {
  mapSmsReadinessToDisabledReason,
  smsResultSummary,
  splitSmsRecipients,
} from "@/lib/dashboard/communication-workflows";

const sourceRoots = [
  "src/components/school",
  "src/components/portal",
  "src/components/platform",
  "src/components/modules",
  "src/components/operational",
];

const forbiddenFakeOnlyPatterns = [
  /Action completed/i,
  /Workflow dispatched/i,
  /completed successfully/i,
  /is being sent/i,
  /print started/i,
  /export generated/i,
  /opened for .*follow-up/i,
  /Print preview opened for/i,
  /Download prepared for/i,
  /academic record opened/i,
  /profile selected\./i,
  /one-time admin reset bundle is ready/i,
  /Printable preview prepared/i,
  /Print copy prepared from the current form details/i,
  /export preview prepared/i,
  /preview prepared for/i,
  /confirmation opened/i,
  /workspace opened\./i,
  /Navigating to .* route\./i,
  /Statement copied for sharing/i,
  /action details ready/i,
  /selected in finance section/i,
  /selected in security records/i,
  /selected in exams records/i,
  /selected in my class/i,
  /selected in pending reviews/i,
  /selected in counselling records/i,
  /selected in lab records/i,
  /selected in admissions records/i,
  /selected in boarding records/i,
  /selected in exams & performance/i,
  /selected in parent escalations/i,
  /selected for discipline follow-up/i,
  /selected for deputy follow-up/i,
  /Marks entry sheet ready for selected class and subject/i,
  /saved for Dean follow-up/i,
  /saved for review and export/i,
  /export saved for department records/i,
  /application preview recorded\./i,
  /\$\{title\} export saved\./i,
  /\$\{title\} filters applied\./i,
  /\$\{tableAction\.title\} search saved\./i,
  /\$\{tableAction\.title\} filters applied\./i,
  /\$\{communicationDraft\.title\} communication draft saved\./i,
  /Quick admissions action saved\./i,
  /Quick boarding response saved\./i,
  /\$\{parentTemplate\.label\} parent template saved\./i,
  /\$\{streamDetailReview\.title\} review saved\./i,
  /Quick-add counselling session saved\./i,
  /\$\{activeApplicantFilter\} applicant filter applied\./i,
  /\$\{reportReview\} report review saved\./i,
  /\$\{visit\.student\} visit saved\./i,
  /\$\{applicant\.applicant\} saved\./i,
  /\$\{payment\.student\} payment recorded\. Receipt/i,
  /\$\{newCase\.student\} discipline case recorded\./i,
  /\$\{newSession\.student\} counselling session recorded\./i,
  /\$\{exportPreview\} export downloaded\./i,
  /Sick bay register print preview ready\./i,
  /Admissions pipeline print preview ready\./i,
  /Library report print preview ready\./i,
  /Hostel roll call sheet print preview ready\./i,
  /Transport route list print preview ready\./i,
  /Practical checklist print preview ready\./i,
  /Stock CSV downloaded with/i,
  /Fee list CSV downloaded with/i,
  /\$\{visit\?\.student \?\? "Student"\} medical slip print preview ready\./i,
  /\$\{applicant\?\.applicant \?\? "Applicant"\} admission letter print preview ready\./i,
  /\$\{loan\?\.bookTitle \?\? "Book"\} slip print preview ready\./i,
  /\$\{movement\?\.item \?\? "Stock"\} issue slip print preview ready\./i,
  /\$\{payment\?\.receiptNo \?\? "Receipt"\} print preview ready\./i,
  /\$\{visitor\?\.visitor \?\? "Visitor"\} visitor slip print preview ready\./i,
  /\$\{student\.student\} fee statement print preview ready\./i,
  /\$\{disciplineCase\?\.student \?\? "Student"\} discipline letter preview ready\./i,
  /\$\{session\?\.student \?\? "Student"\} counselling summary preview ready\./i,
];

function readFiles(dir: string): string[] {
  const absolute = path.join(process.cwd(), dir);

  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(absolute, entry.name);

    if (entry.isDirectory()) {
      return readFiles(path.relative(process.cwd(), target));
    }

    if (!/\.(ts|tsx)$/.test(entry.name)) {
      return [];
    }

    return [target];
  });
}

describe("dashboard production readiness safety", () => {
  it("does not contain fake-only success phrases in dashboard source", () => {
    const offenders: string[] = [];

    for (const root of sourceRoots) {
      for (const file of readFiles(root)) {
        const source = fs.readFileSync(file, "utf8");

        for (const pattern of forbiddenFakeOnlyPatterns) {
          if (pattern.test(source)) {
            offenders.push(`${path.relative(process.cwd(), file)} matched ${pattern}`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("maps SMS readiness into specific disabled reasons", () => {
    expect(
      mapSmsReadinessToDisabledReason({
        can_send: false,
        disabled_reason: "SMS provider is not configured.",
        missing: ["apiKey"],
      }),
    ).toBe("Disabled: SMS provider is not configured.");

    expect(
      mapSmsReadinessToDisabledReason({
        can_send: true,
        disabled_reason: "",
        missing: [],
      }),
    ).toBeNull();
  });

  it("splits communication recipients and summarizes real bulk SMS evidence", () => {
    const recipients = splitSmsRecipients([
      { id: "parent-1", name: "Mary Were", role: "parent", phone: "0712 345 678", linkedStudent: "Calvin Were" },
      { id: "parent-2", name: "Grace Akinyi", role: "guardian", phone: "", linkedStudent: "Faith Akinyi" },
    ]);

    expect(recipients.sendable).toHaveLength(1);
    expect(recipients.missingPhone).toHaveLength(1);
    expect(
      smsResultSummary({
        sent_count: 1,
        failed_count: 0,
        skipped_count: 1,
        failures: [],
        skipped: [{ recipient_id: "parent-2", reason: "Missing phone number" }],
      }),
    ).toBe("SMS queued: 1 sent, 0 failed, 1 skipped.");
  });
});
