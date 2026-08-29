export type SchoolStaffOptionInput = {
  id?: string;
  user_id?: string;
  label?: string;
  name?: string;
  full_name?: string;
  preferred_name?: string;
  display_name?: string;
  email?: string;
  staff_number?: string;
  role_code?: string;
  role_name?: string;
  role_codes?: string[];
  role_names?: string[];
  teaching_subjects?: string[];
  subject_names?: string[];
  hod_departments?: string[];
  department_names?: string[];
};

export type SchoolStaffOption = {
  value: string;
  label: string;
  name: string;
  roleNames: string[];
  teachingSubjects: string[];
  hodDepartments: string[];
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  owner: "School Owner",
  principal: "Principal",
  deputy_principal: "Deputy Principal",
  teacher: "Teacher",
  class_teacher: "Class Teacher",
  grade_master: "Grade/Form Master",
  form_master: "Form Master",
  hod: "Head of Department",
  head_of_department: "Head of Department",
  dean: "Dean of Academics",
  dean_academics: "Dean of Academics",
  exams_manager: "Exams Manager",
  exam_manager: "Exams Manager",
  counsellor: "School Counsellor",
  school_counsellor: "School Counsellor",
  discipline_master: "Discipline Master",
  boarding_master: "Boarding Master",
  assistant_class_teacher: "Assistant Class Teacher",
  subject_coordinator: "Subject Coordinator",
  curriculum_coordinator: "Curriculum Coordinator",
  academic_year_coordinator: "Academic Year Coordinator",
  timetable_coordinator: "Timetable Coordinator",
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value.toLocaleLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function values(input: unknown) {
  return Array.isArray(input) ? input.map(clean).filter(Boolean) : [];
}

export function schoolRoleLabel(value: string) {
  const normalized = clean(value).toLocaleLowerCase().replace(/[\s-]+/g, "_");
  if (!normalized) return "";
  return ROLE_LABELS[normalized]
    ?? normalized.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function optionName(option: SchoolStaffOptionInput) {
  const staffNumber = clean(option.staff_number).toLocaleLowerCase();
  return [
    option.label,
    option.full_name,
    option.preferred_name,
    option.display_name,
    option.name,
    option.email,
  ]
    .map(clean)
    .find((value) => value && (!staffNumber || value.toLocaleLowerCase() !== staffNumber))
    || "Unnamed staff member";
}

function summarized(valuesToSummarize: string[], limit = 2) {
  if (valuesToSummarize.length <= limit) return valuesToSummarize.join(", ");
  return `${valuesToSummarize.slice(0, limit).join(", ")} +${valuesToSummarize.length - limit}`;
}

function roleNames(option: SchoolStaffOptionInput) {
  const roles = unique([
    ...values(option.role_names).map(schoolRoleLabel),
    schoolRoleLabel(clean(option.role_name)),
    ...values(option.role_codes).map(schoolRoleLabel),
    schoolRoleLabel(clean(option.role_code)),
  ].filter(Boolean));
  const departments = hodDepartments(option);
  if (departments.length === 0) {
    return roles.map((role) => (
      role === "Head of Department" ? "Head of Department (department not assigned)" : role
    ));
  }

  const contextualHodRole = `Head of Department (${summarized(departments)})`;
  const contextualRoles = roles.filter((role) => role !== "Head of Department");
  const teacherIndex = contextualRoles.indexOf("Teacher");
  contextualRoles.splice(teacherIndex >= 0 ? teacherIndex + 1 : 0, 0, contextualHodRole);
  return unique(contextualRoles);
}

function teachingSubjects(option: SchoolStaffOptionInput) {
  return unique([
    ...values(option.teaching_subjects),
    ...values(option.subject_names),
  ].filter(Boolean));
}

function hodDepartments(option: SchoolStaffOptionInput) {
  return unique([
    ...values(option.hod_departments),
    ...values(option.department_names),
  ].filter(Boolean));
}

export function formatSchoolStaffOptionLabel(option: SchoolStaffOptionInput) {
  const name = optionName(option);
  const roles = roleNames(option);
  const subjects = teachingSubjects(option);
  const details = [
    roles.length > 0 ? summarized(roles) : "",
    subjects.length > 0 ? `Teaches ${summarized(subjects)}` : "",
  ].filter(Boolean);

  if (details.length > 0) return `${name} — ${details.join(" · ")}`;
  return name;
}

export function buildSchoolStaffOptions(rows: SchoolStaffOptionInput[] | undefined): SchoolStaffOption[] {
  const staffByUserId = new Map<string, SchoolStaffOptionInput>();

  for (const row of rows ?? []) {
    const value = clean(row.user_id || row.id);
    if (!value) continue;
    const existing = staffByUserId.get(value);
    staffByUserId.set(value, existing ? {
      ...existing,
      ...row,
      label: row.label || existing.label,
      name: row.name || existing.name,
      full_name: row.full_name || existing.full_name,
      preferred_name: row.preferred_name || existing.preferred_name,
      display_name: row.display_name || existing.display_name,
      email: row.email || existing.email,
      staff_number: row.staff_number || existing.staff_number,
      role_codes: unique([...values(existing.role_codes), clean(existing.role_code), ...values(row.role_codes), clean(row.role_code)].filter(Boolean)),
      role_names: unique([...values(existing.role_names), clean(existing.role_name), ...values(row.role_names), clean(row.role_name)].filter(Boolean)),
      teaching_subjects: unique([...values(existing.teaching_subjects), ...values(existing.subject_names), ...values(row.teaching_subjects), ...values(row.subject_names)]),
      hod_departments: unique([...values(existing.hod_departments), ...values(existing.department_names), ...values(row.hod_departments), ...values(row.department_names)]),
    } : row);
  }

  return [...staffByUserId.entries()]
    .map(([value, row]) => ({
      value,
      label: formatSchoolStaffOptionLabel(row),
      name: optionName(row),
      roleNames: roleNames(row),
      teachingSubjects: teachingSubjects(row),
      hodDepartments: hodDepartments(row),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}
