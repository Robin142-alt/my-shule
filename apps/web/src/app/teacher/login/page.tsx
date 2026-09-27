import { AuthShell } from "@/components/auth/auth-shell";
import { PublicSchoolLoginView } from "@/components/auth/public-school-login-view";

export default function TeacherLoginPage() {
  return (
    <AuthShell>
      <PublicSchoolLoginView intent="teacher" />
    </AuthShell>
  );
}
