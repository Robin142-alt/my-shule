import {
  buildSchoolStaffOptions,
  formatSchoolStaffOptionLabel,
} from "@/lib/school/staff-option-label";

describe("school staff dropdown labels", () => {
  it("shows human roles and active teaching subjects next to the staff name", () => {
    expect(formatSchoolStaffOptionLabel({
      user_id: "teacher-1",
      label: "Robinson Ondu",
      role_codes: ["teacher", "hod"],
      teaching_subjects: ["Mathematics", "Physics"],
      hod_departments: ["Sciences"],
      staff_number: "TSC-102",
    })).toBe("Robinson Ondu — Teacher, Head of Department (Sciences) · Teaches Mathematics, Physics");
  });

  it("never exposes staff or TSC numbers in labels or name fallbacks", () => {
    expect(formatSchoolStaffOptionLabel({
      label: "TSC-102",
      email: "teacher@example.test",
      staff_number: "TSC-102",
      role_code: "teacher",
    })).toBe("teacher@example.test — Teacher");
    expect(formatSchoolStaffOptionLabel({
      label: "TSC-103",
      staff_number: "TSC-103",
    })).toBe("Unnamed staff member");
  });

  it("shows the department for canonical HOD appointments even without an HOD account role", () => {
    expect(formatSchoolStaffOptionLabel({
      label: "Amina Otieno",
      role_codes: ["teacher", "class_teacher", "grade_master"],
      hod_departments: ["Languages"],
    })).toBe("Amina Otieno — Teacher, Head of Department (Languages) +2");
  });

  it("does not present an unconfigured HOD role as though its department were known", () => {
    expect(formatSchoolStaffOptionLabel({
      label: "Peter Kamau",
      role_code: "hod",
    })).toBe("Peter Kamau — Head of Department (department not assigned)");
  });

  it("deduplicates membership rows by user id while retaining every role", () => {
    const options = buildSchoolStaffOptions([
      { user_id: "teacher-1", label: "Robinson Ondu", role_code: "teacher" },
      { user_id: "teacher-1", label: "Robinson Ondu", role_code: "deputy_principal", teaching_subjects: ["Mathematics"], hod_departments: ["Sciences"] },
      { user_id: "teacher-2", label: "Robinson Ondu", role_code: "exams_manager" },
    ]);

    expect(options).toHaveLength(2);
    expect(options.find((option) => option.value === "teacher-1")?.label).toBe(
      "Robinson Ondu — Teacher, Head of Department (Sciences) +1 · Teaches Mathematics",
    );
    expect(options.find((option) => option.value === "teacher-1")?.hodDepartments).toEqual(["Sciences"]);
    expect(options.find((option) => option.value === "teacher-2")?.label).toBe(
      "Robinson Ondu — Exams Manager",
    );
  });

  it("caps long role and subject lists for usable native selects", () => {
    expect(formatSchoolStaffOptionLabel({
      label: "Amina Otieno",
      role_codes: ["teacher", "class_teacher", "grade_master"],
      teaching_subjects: ["Biology", "Chemistry", "Physics"],
    })).toBe("Amina Otieno — Teacher, Class Teacher +1 · Teaches Biology, Chemistry +1");
  });
});
