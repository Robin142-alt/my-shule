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

export function CardHeader({ children, className = "", ...props }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
  return <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>{children}</div>
}

export function CardTitle({ children, className = "", ...props }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
  return <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`} {...props}>{children}</h3>
}

export function CardDescription({ children, className = "", ...props }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
  return <p className={`text-sm text-muted-foreground ${className}`} {...props}>{children}</p>
}

export function CardContent({ children, className = "", ...props }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
  return <div className={`p-6 pt-0 ${className}`} {...props}>{children}</div>
}
