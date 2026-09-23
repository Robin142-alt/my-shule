import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl min-w-0">
        <p className="eyebrow">
          {eyebrow}
        </p>
        <h2 className="mt-1.5 text-xl font-bold text-foreground tracking-tight">{title}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>
        {meta ? <div className="mt-2.5 flex flex-wrap gap-2">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 lg:shrink-0">{actions}</div>
      ) : null}
    </div>
  );
}
