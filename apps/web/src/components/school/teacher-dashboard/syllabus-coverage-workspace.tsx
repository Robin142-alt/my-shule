import { BookOpen } from "lucide-react";
import { Panel, RecordTable } from "./shared-components";

export function SyllabusCoverageWorkspace() {
  return (
    <Panel title="Syllabus Coverage" description="Track how much syllabus you have covered per class and subject." icon={BookOpen}>
      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Covered Topics</p>
          <p className="text-2xl font-black text-[#071D49]">0</p>
        </article>
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Pending Topics</p>
          <p className="text-2xl font-black text-[#071D49]">0</p>
        </article>
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Coverage %</p>
          <p className="text-2xl font-black text-[#071D49]">0%</p>
        </article>
      </div>
      <div className="mb-4">
        <button type="button" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Update Coverage</button>
      </div>
      <RecordTable
        columns={["Class", "Subject", "Unit/Strand", "Topic", "Coverage Status", "Completion Date", "Actions"]}
        rows={[]}
        emptyState="No topics tracked."
      />
    </Panel>
  );
}
