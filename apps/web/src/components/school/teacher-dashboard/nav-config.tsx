import {
  LayoutDashboard,
  CalendarDays,
  Users,
  CheckSquare,
  BookOpen,
  ClipboardList,
  GraduationCap,
  LineChart,
  MessageSquare,
  Package,
  FileText,
  UserCircle,
  UsersRound,
  Sword,
  Activity,
  Bell,
  FlaskConical
} from "lucide-react";
import { TeacherView } from "./types";

export const navItems: Array<{
  id: TeacherView;
  label: string;
  icon: any;
  group: string;
}> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "Dashboard" },
  { id: "timetable", label: "My Timetable", icon: CalendarDays, group: "Dashboard" },
  { id: "classes", label: "My Classes", icon: Users, group: "Academics" },
  { id: "attendance", label: "Attendance", icon: CheckSquare, group: "Academics" },
  { id: "lesson-log", label: "Lesson Log", icon: BookOpen, group: "Academics" },
  { id: "syllabus-coverage", label: "Syllabus", icon: ClipboardList, group: "Academics" },
  { id: "assignments", label: "Assignments", icon: FileText, group: "Academics" },
  { id: "assessments-cats", label: "Assessments", icon: Activity, group: "Assessments" },
  { id: "exams-marks", label: "Exams & Marks", icon: GraduationCap, group: "Assessments" },
  { id: "learner-progress", label: "Learner Progress", icon: LineChart, group: "Assessments" },
  { id: "discipline-welfare", label: "Discipline", icon: Sword, group: "Student Support" },
  { id: "parent-communication", label: "Parents", icon: MessageSquare, group: "Student Support" },
  { id: "teaching-resources", label: "Resources", icon: BookOpen, group: "Operations" },
  { id: "practical-requisitions", label: "Practical Requisitions", icon: FlaskConical, group: "Operations" },
  { id: "store-requests", label: "Store Requests", icon: Package, group: "Operations" },
  { id: "reports", label: "Reports", icon: FileText, group: "Operations" },
  { id: "notifications", label: "Notifications", icon: Bell, group: "Account" },
  { id: "profile", label: "My Profile", icon: UserCircle, group: "Account" },
  { id: "class-teacher", label: "Class Teacher", icon: UsersRound, group: "Roles" },
  { id: "club", label: "Club Patron", icon: Users, group: "Roles" },
  { id: "invigilation", label: "Invigilation", icon: Activity, group: "Roles" },
];
