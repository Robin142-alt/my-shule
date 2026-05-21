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
    navy: "bg-[#eff6ff] text-[#0b1f3a]",
    orange: "bg-[#fff7ed] text-[#c2410c]",
    blue: "bg-[#dbeafe] text-[#1d4ed8]",
    slate: "bg-[#f1f5f9] text-[#334155]",
  }[tone];

  return (
    <article className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {icon ? (
        <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}>
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold leading-6 text-[#0b1f3a]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#475569]">{description}</p>
    </article>
  );
}
