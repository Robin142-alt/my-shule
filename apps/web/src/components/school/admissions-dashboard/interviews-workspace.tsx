"use client";
import { UserCheck } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { AdmissionsEmptyStateCell, APPLICATIONS_HREF } from "./empty-state-cell";

type InterviewsData = {
  metrics: Record<string, number>;
  items: any[];
};

export function InterviewsWorkspace() {
  const { data, isLoading } = useSchoolQuery<InterviewsData>("/admin-command/admissions/interviews");
  const items = data?.items || [];

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex min-w-0 gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-info-soft text-info">
          <UserCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-black tracking-[-0.01em] text-foreground">Interviews</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Schedule and record admission interviews.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Scheduled</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.scheduled ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Completed</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.completed ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold">Student</th>
              <th className="px-4 py-3 font-bold">Date</th>
              <th className="px-4 py-3 font-bold">Interviewer</th>
              <th className="px-4 py-3 font-bold">Score</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Loading...</td></tr>
            ) : items.length === 0 ? (
              <AdmissionsEmptyStateCell
                colSpan={5}
                title="No interviews scheduled yet"
                body="Review applications and move qualified learners into selection before scheduling interview slots."
                actionHref={APPLICATIONS_HREF}
                actionLabel="Review applications"
              />
            ) : (
              items.map((row: any, i: number) => (
                <tr key={row.id || i} className="border-t border-border hover:bg-surface-muted">
                  <td className="px-4 py-3 text-muted">{row.student_name}</td>
                  <td className="px-4 py-3 text-muted">{row.date}</td>
                  <td className="px-4 py-3 text-muted">{row.interviewer}</td>
                  <td className="px-4 py-3 text-muted">{row.score}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap">{row.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
