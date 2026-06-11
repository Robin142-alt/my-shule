import { TrendingUp } from "lucide-react";
import { Panel } from "../shared";
import { useClassTeacherProgress } from "@/lib/data/class-teacher-hooks";

export function AcademicProgressWorkspace() {
  const streamId = "stream_123";
  const { data, isLoading, error } = useClassTeacherProgress(streamId);

  if (isLoading) {
    return (
      <Panel title="Academic Progress" description="Monitor the class's overall academic performance and identify learners needing support." icon={TrendingUp}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D4ED8] border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="Academic Progress" description="Monitor the class's overall academic performance and identify learners needing support." icon={TrendingUp}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 font-bold">Failed to load academic progress.</div>
      </Panel>
    );
  }

  return (
    <Panel title="Academic Progress" description="Monitor the class's overall academic performance and identify learners needing support." icon={TrendingUp}>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 font-bold text-[#071D49]">Class Mean: {data.classMean}</div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 font-bold text-[#071D49]">Class Grade: {data.classGrade}</div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">Missing Marks: {data.missingMarksSubjects} subjects</div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-800 md:col-span-3">Top Performer: {data.topPerformer}</div>
      </div>
      <div className="mt-4 p-4 rounded bg-amber-50 text-amber-800 font-medium">
        {data.learnersBelowTarget} learners are performing below their target grade.
      </div>
    </Panel>
  );
}
