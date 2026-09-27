import type { ReactNode } from "react";

export function AuthCard({
  children,
}: {
  children: ReactNode;
  size?: "default" | "wide";
}) {
  return <div className="auth-card">{children}</div>;
}
