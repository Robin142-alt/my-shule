import type { SchoolExperienceRole } from "@/lib/experiences/types";

export function resolveTimeAwareGreeting(date: Date | null = new Date()) {
  if (!date) {
    return "Welcome Back";
  }

  const hour = date.getHours();

  if (hour >= 5 && hour < 12) {
    return "Good Morning";
  }

  if (hour >= 12 && hour < 17) {
    return "Good Afternoon";
  }

  if (hour >= 17 && hour < 22) {
    return "Good Evening";
  }

  return "Welcome Back";
}

export function buildTimeAwareGreeting(name: string, date: Date | null = new Date()) {
  const displayName = normalizeGreetingName(name);

  return `${resolveTimeAwareGreeting(date)}, ${displayName}`;
}

export function normalizeGreetingName(name: string, fallback = "there") {
  const trimmed = name.trim();

  return trimmed.length > 0 ? trimmed : fallback;
}

export const schoolRoleGreetingNames: Record<SchoolExperienceRole, string> = {
  principal: "Principal",
  "deputy-principal": "Deputy Principal",
  secretary: "Secretary",
  bursar: "Bursar",
  accountant: "Accountant",
  teacher: "Teacher",
  "dean-academics": "Dean",
  "exams-manager": "Exams Manager",
  hod: "HOD",
  hos: "Head of Subject",
  "class-teacher": "Class Teacher",
  "grade-master": "Grade Master",
  admin: "Admin",
  student: "Student",
  "ict-manager": "ICT Manager",
  storekeeper: "Storekeeper",
  librarian: "Librarian",
  nurse: "Nurse",
  "boarding-master": "Boarding Master",
  "security-officer": "Security Officer",
  "transport-manager": "Transport Manager",
  "laboratory-technician": "Lab Technician",
  "guidance-counselling": "Counselor",
  "discipline-master": "Discipline Master",
  admissions: "Admissions Officer",
  "procurement-officer": "Procurement Officer",
};

export function getSchoolRoleGreetingName(role: SchoolExperienceRole) {
  return schoolRoleGreetingNames[role];
}
