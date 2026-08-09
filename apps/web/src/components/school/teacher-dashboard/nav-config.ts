import {
  Bell,
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Home,
  MessageCircle,
  Settings,
  Users,
  LayoutList,
  CheckSquare,
  BookOpen,
  LineChart,
  ShieldAlert,
  FolderOpen,
  ShoppingCart,
  User,
  Medal,
  PenTool,
  BarChart3,
  FlaskConical,
  type LucideIcon,
} from "lucide-react";
import { TeacherView } from "./types";

export type NavItem = {
  id: TeacherView;
  label: string;
  icon: LucideIcon;
  group?: string;
  isConditional?: boolean;
};

export const navItems: NavItem[] = [
  // General / Core
  { id: "overview", label: "Overview", icon: Home, group: "Dashboard" },
  
  // Timetable
  { id: "timetable", label: "My Timetable", icon: CalendarDays, group: "Schedule" },
  
  // Teaching
  { id: "classes", label: "My Classes", icon: Users, group: "Teaching" },
  { id: "attendance", label: "Attendance", icon: CheckSquare, group: "Teaching" },
  { id: "lesson-log", label: "Lesson Log", icon: LayoutList, group: "Teaching" },
  { id: "syllabus-coverage", label: "Syllabus Coverage", icon: BookOpen, group: "Teaching" },
  
  // Assessments
  { id: "assignments", label: "Assignments & Homework", icon: ClipboardCheck, group: "Assessments" },
  { id: "assessments-cats", label: "Assessments / CATs", icon: PenTool, group: "Assessments" },
  { id: "exams-marks", label: "Exams & Marks", icon: BookOpenCheck, group: "Assessments" },
  { id: "academic-intelligence", label: "Academic Intelligence", icon: BarChart3, group: "Assessments" },
  
  // Learner Management
  { id: "learner-progress", label: "Learner Progress", icon: LineChart, group: "Learner Management" },
  { id: "discipline-welfare", label: "Discipline & Welfare", icon: ShieldAlert, group: "Learner Management" },
  { id: "parent-communication", label: "Parent Communication", icon: MessageCircle, group: "Learner Management" },
  
  // Resources & Admin
  { id: "teaching-resources", label: "Teaching Resources", icon: FolderOpen, group: "Resources & Admin" },
  { id: "practical-requisitions", label: "Practical Requisitions", icon: FlaskConical, group: "Resources & Admin" },
  { id: "store-requests", label: "Store Requests", icon: ShoppingCart, group: "Resources & Admin" },
  { id: "reports", label: "Reports & Downloads", icon: FileText, group: "Resources & Admin" },
  { id: "notifications", label: "Notifications", icon: Bell, group: "Resources & Admin" },
  { id: "profile", label: "My Profile", icon: Settings, group: "Resources & Admin" },

  // Conditional
  { id: "class-teacher", label: "Class Teacher Workspace", icon: User, group: "Additional Duties", isConditional: true },
  { id: "club", label: "Club / Co-curricular", icon: Medal, group: "Additional Duties", isConditional: true },
  { id: "invigilation", label: "Invigilation Duties", icon: PenTool, group: "Additional Duties", isConditional: true },
];
