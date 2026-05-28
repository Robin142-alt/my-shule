import { getRoleHomePath } from "@/lib/auth/role-routing";
import { getSchoolRoleAlias } from "@/lib/auth/school-role-normalization";

describe("SaaS identity role routing", () => {
  test("routes users directly to the required role dashboard", () => {
    expect(getRoleHomePath("superadmin")).toBe("/superadmin/dashboard");
    expect(getRoleHomePath("platform_owner")).toBe("/superadmin/dashboard");
    expect(getRoleHomePath("principal")).toBe("/school/principal");
    expect(getRoleHomePath("deputy-principal")).toBe("/school/deputy-principal");
    expect(getRoleHomePath("secretary")).toBe("/school/secretary");
    expect(getRoleHomePath("owner")).toBe("/school/principal");
    expect(getRoleHomePath("bursar")).toBe("/school/bursar");
    expect(getRoleHomePath("accountant")).toBe("/school/accountant");
    expect(getRoleHomePath("teacher")).toBe("/school/teacher");
    expect(getRoleHomePath("dean_academics")).toBe("/school/dean-academics");
    expect(getRoleHomePath("dean-of-academics")).toBe("/school/dean-academics");
    expect(getRoleHomePath("academic_dean")).toBe("/school/dean-academics");
    expect(getRoleHomePath("exams_manager")).toBe("/school/exams-manager");
    expect(getRoleHomePath("exams-manager")).toBe("/school/exams-manager");
    expect(getRoleHomePath("exam_officer")).toBe("/school/exams-manager");
    expect(getRoleHomePath("hod")).toBe("/school/hod");
    expect(getRoleHomePath("head_of_department")).toBe("/school/hod");
    expect(getRoleHomePath("head-of-department")).toBe("/school/hod");
    expect(getRoleHomePath("class_teacher")).toBe("/school/class-teacher");
    expect(getRoleHomePath("class-teacher")).toBe("/school/class-teacher");
    expect(getRoleHomePath("grade_master")).toBe("/school/grade-master");
    expect(getRoleHomePath("form_master")).toBe("/school/grade-master");
    expect(getRoleHomePath("grade-master")).toBe("/school/grade-master");
    expect(getRoleHomePath("form-master")).toBe("/school/grade-master");
    expect(getRoleHomePath("registrar")).toBe("/school/admissions");
    expect(getRoleHomePath("admissions")).toBe("/school/admissions");
    expect(getRoleHomePath("storekeeper")).toBe("/school/storekeeper");
    expect(getRoleHomePath("librarian")).toBe("/school/librarian");
    expect(getRoleHomePath("boarding_master")).toBe("/school/boarding-master");
    expect(getRoleHomePath("boarding-master")).toBe("/school/boarding-master");
    expect(getRoleHomePath("security_officer")).toBe("/school/security-officer");
    expect(getRoleHomePath("security-officer")).toBe("/school/security-officer");
    expect(getRoleHomePath("transport_manager")).toBe("/school/transport-manager");
    expect(getRoleHomePath("transport-manager")).toBe("/school/transport-manager");
    expect(getRoleHomePath("lab_technician")).toBe("/school/laboratory-technician");
    expect(getRoleHomePath("laboratory_technician")).toBe("/school/laboratory-technician");
    expect(getRoleHomePath("lab-technician")).toBe("/school/laboratory-technician");
    expect(getRoleHomePath("laboratory-technician")).toBe("/school/laboratory-technician");
    expect(getRoleHomePath("school_counsellor")).toBe("/school/guidance-counselling");
    expect(getRoleHomePath("school-counsellor")).toBe("/school/guidance-counselling");
    expect(getRoleHomePath("counsellor")).toBe("/school/guidance-counselling");
    expect(getRoleHomePath("guidance_counselling")).toBe("/school/guidance-counselling");
    expect(getRoleHomePath("guidance-counselling")).toBe("/school/guidance-counselling");
    expect(getRoleHomePath("discipline_master")).toBe("/school/discipline-master");
    expect(getRoleHomePath("discipline-master")).toBe("/school/discipline-master");
    expect(getRoleHomePath("dean_of_students")).toBe("/school/discipline-master");
    expect(getRoleHomePath("parent")).toBe("/portal/dashboard");
  });

  test("keeps school staff away from legacy generic dashboard home paths", () => {
    const schoolRoles = [
      "principal",
      "secretary",
      "admin",
      "bursar",
      "accountant",
      "teacher",
      "nurse",
      "storekeeper",
      "librarian",
      "boarding-master",
      "security-officer",
      "transport-manager",
      "laboratory-technician",
      "discipline-master",
    ];

    for (const role of schoolRoles) {
      const homePath = getRoleHomePath(role);

      expect(homePath).toMatch(/^\/school\//);
      expect(homePath).not.toBe("/dashboard");
      expect(homePath).not.toMatch(/^\/dashboard\//);
      expect(homePath).not.toBe("/inventory/dashboard");
      expect(homePath).not.toBe("/library/dashboard");
      expect(homePath).not.toBe("/finance/dashboard");
    }
  });

  test("does not self-redirect canonical school role routes", () => {
    expect(getSchoolRoleAlias("security_officer")).toBe("security-officer");
    expect(getSchoolRoleAlias("transport_manager")).toBe("transport-manager");
    expect(getSchoolRoleAlias("transport-manager")).toBeNull();
    expect(getSchoolRoleAlias("boarding_master")).toBe("boarding-master");
    expect(getSchoolRoleAlias("security-officer")).toBeNull();
    expect(getSchoolRoleAlias("deputy-principal")).toBeNull();
    expect(getSchoolRoleAlias("boarding-master")).toBeNull();
    expect(getSchoolRoleAlias("registrar")).toBe("admissions");
    expect(getSchoolRoleAlias("lab_technician")).toBe("laboratory-technician");
    expect(getSchoolRoleAlias("lab-technician")).toBe("laboratory-technician");
    expect(getSchoolRoleAlias("laboratory_technician")).toBe("laboratory-technician");
    expect(getSchoolRoleAlias("laboratory-technician")).toBeNull();
    expect(getSchoolRoleAlias("school_counsellor")).toBe("guidance-counselling");
    expect(getSchoolRoleAlias("school-counsellor")).toBe("guidance-counselling");
    expect(getSchoolRoleAlias("counsellor")).toBe("guidance-counselling");
    expect(getSchoolRoleAlias("guidance_counselling")).toBe("guidance-counselling");
    expect(getSchoolRoleAlias("guidance-counselling")).toBeNull();
    expect(getSchoolRoleAlias("discipline_master")).toBe("discipline-master");
    expect(getSchoolRoleAlias("dean_of_students")).toBe("discipline-master");
    expect(getSchoolRoleAlias("discipline-master")).toBeNull();
    expect(getSchoolRoleAlias("dean_academics")).toBe("dean-academics");
    expect(getSchoolRoleAlias("dean-of-academics")).toBe("dean-academics");
    expect(getSchoolRoleAlias("academic_dean")).toBe("dean-academics");
    expect(getSchoolRoleAlias("dean-academics")).toBeNull();
    expect(getSchoolRoleAlias("exams_manager")).toBe("exams-manager");
    expect(getSchoolRoleAlias("exam_officer")).toBe("exams-manager");
    expect(getSchoolRoleAlias("examination_officer")).toBe("exams-manager");
    expect(getSchoolRoleAlias("exams-manager")).toBeNull();
    expect(getSchoolRoleAlias("class_teacher")).toBe("class-teacher");
    expect(getSchoolRoleAlias("class-teacher")).toBeNull();
    expect(getSchoolRoleAlias("head_of_department")).toBe("hod");
    expect(getSchoolRoleAlias("head-of-department")).toBe("hod");
    expect(getSchoolRoleAlias("department_head")).toBe("hod");
    expect(getSchoolRoleAlias("hod")).toBeNull();
    expect(getSchoolRoleAlias("grade_master")).toBe("grade-master");
    expect(getSchoolRoleAlias("form_master")).toBe("grade-master");
    expect(getSchoolRoleAlias("form-master")).toBe("grade-master");
    expect(getSchoolRoleAlias("grade-master")).toBeNull();
  });
});
