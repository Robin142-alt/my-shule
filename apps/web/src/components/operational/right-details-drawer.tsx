import { Archive, ClipboardList, FileText, History, MessageSquareText, ShieldCheck } from "lucide-react";

const sectionMeta = {
  details: { label: "Details", icon: ClipboardList },
  comments: { label: "Comments", icon: MessageSquareText },
  attachments: { label: "Attachments", icon: FileText },
  history: { label: "History", icon: History },
  workflow: { label: "Workflow State", icon: Archive },
  audit: { label: "Audit Trail", icon: ShieldCheck },
} as const;

export type RightDetailsDrawerSections = Record<keyof typeof sectionMeta, string[]>;

export function RightDetailsDrawer({
  title,
  subtitle,
  sections,
}: {
  title: string;
  subtitle?: string;
  sections: RightDetailsDrawerSections;
}) {
  return (
    <aside
      aria-label={title}
      className="rounded-[var(--radius-xl)] border border-border bg-surface/95 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)]"
    >
      <p className="eyebrow">Operational drawer</p>
      <h2 className="mt-2 text-lg font-black text-foreground">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm font-semibold text-muted">{subtitle}</p> : null}

      <div className="mt-5 space-y-3">
        {Object.entries(sectionMeta).map(([key, meta]) => {
          const Icon = meta.icon;
          const items = sections[key as keyof RightDetailsDrawerSections];

          return (
            <section key={key} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted/75 p-3">
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-accent" />
                <h3 className="text-xs font-black uppercase tracking-[0.14em] text-muted">{meta.label}</h3>
              </div>
              <div className="mt-2 space-y-1">
                {items.map((item) => (
                  <p key={item} className="rounded-[var(--radius-xs)] border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground">
                    {item}
                  </p>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
