import {
  extractEnabledModuleCodes,
  isSchoolModuleEnabledFromPayload,
  resolveSchoolModuleAccessState,
} from "@/lib/module-access/server-school-module-access";

describe("library module route access", () => {
  it("reads enabled library modules from school module API envelopes", () => {
    const payload = {
      data: {
        modules: [
          { code: "students", enabled: true },
          { code: "library", enabled: true },
          { code: "labs", enabled: false },
        ],
      },
    };

    expect(extractEnabledModuleCodes(payload)).toEqual(new Set(["students", "library"]));
    expect(isSchoolModuleEnabledFromPayload(payload, "library")).toBe(true);
    expect(isSchoolModuleEnabledFromPayload(payload, "labs")).toBe(false);
  });

  it("fails closed when the module payload is unavailable", () => {
    expect(resolveSchoolModuleAccessState(null, "library")).toEqual({
      enabled: false,
      reason: "module_status_unavailable",
    });
  });

  it("returns a disabled reason when the tenant lacks the library module", () => {
    expect(
      resolveSchoolModuleAccessState({
        enabled_modules: ["students", "finance"],
      }, "library"),
    ).toEqual({
      enabled: false,
      reason: "module_disabled",
    });
  });
});
