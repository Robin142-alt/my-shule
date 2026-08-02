import { resolveOperationalSearch } from "@/lib/search/operational-search-resolver";
import { resolveSearchPolicy } from "@/lib/search/search-access-policy";

describe("Implementation 142 role-aware search access policy", () => {
  it("allows full global search only for principal, deputy, secretary, and accountant families", () => {
    expect(resolveSearchPolicy("principal").mode).toBe("GLOBAL_EXECUTIVE");
    expect(resolveSearchPolicy("deputy-principal").mode).toBe("GLOBAL_OPERATIONS");
    expect(resolveSearchPolicy("secretary").mode).toBe("GLOBAL_FRONT_OFFICE");
    expect(resolveSearchPolicy("accountant").mode).toBe("GLOBAL_FINANCE");

    expect(resolveSearchPolicy("teacher").mode).toBe("ROLE_SCOPED");
    expect(resolveSearchPolicy("class-teacher").mode).toBe("ROLE_SCOPED");
    expect(resolveSearchPolicy("parent").mode).toBe("SELF_ONLY");
    expect(resolveSearchPolicy("student").mode).toBe("SELF_ONLY");
    expect(resolveSearchPolicy("nurse").mode).toBe("SENSITIVE_SCOPED");
    expect(resolveSearchPolicy("system-monitor").mode).toBe("PLATFORM_HEALTH");
  });

  it("keeps finance-wide results out of teacher search", () => {
    const teacherResults = resolveOperationalSearch("QEX7ABC123", { role: "teacher" });
    const accountantResults = resolveOperationalSearch("QEX7ABC123", { role: "accountant" });

    expect(teacherResults).toHaveLength(0);
    expect(accountantResults.map((result) => result.type)).toEqual(
      expect.arrayContaining(["receipt", "mpesa"]),
    );
  });

  it("removes fee-balance actions from teacher, class-teacher, and grade-master student search", () => {
    for (const role of ["teacher", "class-teacher", "grade-master"]) {
      const student = resolveOperationalSearch("Brian", { role })[0];
      expect(student?.actions.map((action) => action.label)).not.toContain("View Fee Balance");
    }

    for (const role of ["principal", "deputy-principal", "secretary", "accountant"]) {
      const student = resolveOperationalSearch("Brian", { role })[0];
      expect(student?.actions.map((action) => action.label)).toContain("View Fee Balance");
    }
  });

  it("keeps sensitive case searches inside sensitive role scopes", () => {
    const accountantResults = resolveOperationalSearch("clinic follow-up", { role: "accountant" });
    const nurseResults = resolveOperationalSearch("clinic follow-up", { role: "nurse" });
    const counsellorResults = resolveOperationalSearch("bullying investigation", { role: "guidance-counselling" });
    const disciplineResults = resolveOperationalSearch("bullying investigation", { role: "discipline-master" });

    expect(accountantResults).toHaveLength(0);
    expect(nurseResults.map((result) => result.type)).toContain("healthCase");
    expect(counsellorResults).toHaveLength(0);
    expect(disciplineResults.map((result) => result.type)).toContain("disciplineCase");
  });

  it("limits parent and student portals to self-owned records", () => {
    const parentResults = resolveOperationalSearch("Brian", { role: "parent" });
    const parentPlatformResults = resolveOperationalSearch("Greenfield", { role: "parent" });
    const studentFeeResults = resolveOperationalSearch("QEX7ABC123", { role: "student" });
    const studentAssignmentResults = resolveOperationalSearch("assignment", { role: "student" });

    expect(parentResults.map((result) => result.type)).toContain("student");
    expect(parentPlatformResults).toHaveLength(0);
    expect(studentFeeResults).toHaveLength(0);
    expect(studentAssignmentResults.map((result) => result.type)).toContain("assignment");
  });

  it("keeps platform health search focused on operational infrastructure", () => {
    const monitorResults = resolveOperationalSearch("event replay", { role: "system-monitor" });
    const monitorStudentResults = resolveOperationalSearch("Brian", { role: "system-monitor" });

    expect(monitorResults.map((result) => result.type)).toContain("systemJob");
    expect(monitorStudentResults).toHaveLength(0);
  });
});
