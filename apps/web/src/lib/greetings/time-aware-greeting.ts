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
  principal: "Principal Wanjiku",
  "deputy-principal": "Deputy Principal Otieno",
  secretary: "Fridah Njoroge",
  bursar: "Bursar Achieng",
  accountant: "Accountant Mwikali",
  teacher: "Mr. Kamau",
  "dean-academics": "Dr. Njeri",
  "exams-manager": "Mr. Ochieng",
  hod: "Ms. Amina",
  "class-teacher": "Mr. Kamau",
  "grade-master": "Mrs. Atieno",
  admin: "School Admin Naliaka",
  student: "Brian Otieno",
  "ict-manager": "ICT Manager Mwangi",
  storekeeper: "Mr. Mutua",
  librarian: "Ms. Chebet",
  nurse: "Nurse Wambui",
  "boarding-master": "Mr. Kiptoo",
  "security-officer": "Mr. Omondi",
  "transport-manager": "Mr. Maina",
  "laboratory-technician": "Ms. Adhiambo",
  "guidance-counselling": "Ms. Muthoni",
  "discipline-master": "Mr. Kariuki",
  admissions: "Ms. Nekesa",
};

export function getSchoolRoleGreetingName(role: SchoolExperienceRole) {
  return schoolRoleGreetingNames[role];
}
