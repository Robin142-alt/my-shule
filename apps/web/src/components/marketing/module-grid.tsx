export type ModuleLayer = {
  title: string;
  description: string;
  modules: string[];
};

export function ModuleGrid({ layers }: { layers: ModuleLayer[] }) {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-semibold leading-tight text-[#0b1f3a]">
          System intelligence layers
        </h2>
        <p className="mt-3 text-base leading-7 text-[#475569]">
          MyShule groups school work into clear layers, so leaders understand where visibility is strong and where attention is needed.
        </p>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {layers.map((layer) => (
          <article key={layer.title} className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-[#0b1f3a]">{layer.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#64748b]">{layer.description}</p>
            <ul className="mt-4 space-y-2">
              {layer.modules.map((module) => (
                <li key={module} className="rounded-lg bg-[#f8fafc] px-3 py-2 text-sm font-medium text-[#334155]">
                  {module}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
