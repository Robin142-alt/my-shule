import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className = "",
  hover = false,
  ...props
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
} & HTMLAttributes<HTMLElement>) {
  return (
    <section
      {...props}
      className={`dashboard-card ${hover ? "enterprise-card-hover cursor-pointer" : ""} ${className}`}
    >
      {children}
    </section>
  );
}
