export function resolveDashboardActionHref(role: string, action: string) {
  const normalizedRole = (role || "admin").replace(/_/g, "-");

  if (action === "students.admit") {
    const targetRole = normalizedRole === "admissions-officer" ? "admissions" : normalizedRole;
    return `/school/${targetRole}/admissions?view=new-registration`;
  }

  if (action === "finance.record_payment") {
    if (normalizedRole === "accountant" || normalizedRole === "bursar") {
      return `/school/${normalizedRole}/payments`;
    }

    return `/school/${normalizedRole}/finance?view=record-payment`;
  }

  if (action === "exams.publish") {
    if (normalizedRole === "exams-manager") {
      return "/school/exams-manager/publishing";
    }

    return `/school/${normalizedRole}/exams?view=publishing`;
  }

  return `/school/${normalizedRole}`;
}
