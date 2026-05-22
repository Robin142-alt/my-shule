import type { ReactNode } from "react";

export function AuthCard({
  children,
  size = "default",
}: {
  children: ReactNode;
  size?: "default" | "wide";
}) {
  return (
    <div
      className={`w-full min-w-0 border border-border bg-white shadow-[var(--shadow-md)] ${
        size === "wide" ? "rounded-[var(--radius-xl)] p-5 sm:p-7" : "rounded-[var(--radius-xl)] p-5 sm:p-7 md:p-8"
      }`}
    >
      {children}
    </div>
  );
}
