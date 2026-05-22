export function InfoCard({
  title,
  description,
  icon,
  tone = "navy",
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  tone?: "navy" | "orange" | "blue" | "slate";
}) {
  const toneClass = {
    navy: "bg-white/[0.08] text-slate-100",
    orange: "bg-accent/15 text-accent",
    blue: "bg-sky-400/15 text-sky-200",
    slate: "bg-slate-400/15 text-muted",
  }[tone];

  return (
    <article className="rounded-xl border border-white/10 bg-surface/80 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.22)] backdrop-blur">
      {icon ? (
        <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}>
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold leading-6 text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </article>
  );
}
