import {
  defaultOnboardingModuleCodes,
  fallbackModuleCatalog,
  implementation100ModuleCodes,
  implementation101ModuleCodes,
} from "@/lib/module-access/module-access-map";

describe("Implementation 100 module catalog", () => {
  it("contains every required production module exactly once", () => {
    const catalogCodes = fallbackModuleCatalog.map((item) => item.code);

    expect(catalogCodes.slice(0, implementation100ModuleCodes.length)).toEqual(implementation100ModuleCodes);
    expect(catalogCodes).toEqual(implementation101ModuleCodes);
    expect(new Set(catalogCodes).size).toBe(28);
  });

  it("does not enable every module by default during onboarding", () => {
    expect(defaultOnboardingModuleCodes).toEqual([
      "students",
      "admissions",
      "academics",
      "finance",
      "exams",
      "discipline",
      "communication_sms",
      "reports",
      "staff",
      "timetable",
      "admin_command_centers",
      "principal_dashboard",
    ]);
  });
});
