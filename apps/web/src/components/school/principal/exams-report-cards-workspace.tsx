"use client";

import { useMemo, useState } from "react";
import { Award } from "lucide-react";
import { toast } from "sonner";

import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import type { LiveExamReportCard } from "@/lib/modules/exams-client";
import { Panel, StatusChip, type Tone } from "./shared";

type ReportCardSeriesGroup = {
  id: string;
  name: string;
  term: string;
  academicYear: string;
  cards: LiveExamReportCard[];
  approved: number;
  published: number;
  withdrawn: number;
};

function groupTone(group: ReportCardSeriesGroup): Tone {
  if (group.published > 0) return "success";
  if (group.approved > 0) return "warning";
  if (group.withdrawn > 0) return "danger";
  return "neutral";
}

function groupStatus(group: ReportCardSeriesGroup) {
  if (group.published > 0) return "Published";
  if (group.approved > 0) return "Ready for release";
  if (group.withdrawn > 0) return "Withdrawn";
  return "Not ready";
}

export function ExamsReportCardsWorkspace() {
  const {
    data,
    error,
    isLoading,
    refetch,
  } = useSchoolQuery<LiveExamReportCard[]>(
    "/exams/report-cards?status=approved,published,withdrawn&limit=50",
  );
  const [busySeriesId, setBusySeriesId] = useState<string | null>(null);
  const [withdrawSeriesId, setWithdrawSeriesId] = useState<string | null>(null);
  const [withdrawReason, setWithdrawReason] = useState("");

  const cards = useMemo(() => data ?? [], [data]);
  const seriesGroups = useMemo(() => {
    const grouped = new Map<string, ReportCardSeriesGroup>();

    for (const card of cards) {
      const seriesId = card.exam_series_id ?? "";
      if (!seriesId) continue;
      const existing = grouped.get(seriesId);
      const group = existing ?? {
        id: seriesId,
        name: card.exam_series_name || "Exam series",
        term: card.term || "",
        academicYear: card.academic_year || "",
        cards: [],
        approved: 0,
        published: 0,
        withdrawn: 0,
      };
      group.cards.push(card);
      if (card.status === "approved") group.approved += 1;
      if (card.status === "published") group.published += 1;
      if (card.status === "withdrawn") group.withdrawn += 1;
      grouped.set(seriesId, group);
    }

    return Array.from(grouped.values());
  }, [cards]);

  const approvedCards = cards.filter((card) => card.status === "approved").length;
  const publishedCards = cards.filter((card) => card.status === "published").length;
  const withdrawnCards = cards.filter((card) => card.status === "withdrawn").length;
  const learnersReady = new Set(
    cards
      .filter((card) => card.status === "approved")
      .map((card) => card.student_id),
  ).size;

  async function publishSeries(group: ReportCardSeriesGroup) {
    setBusySeriesId(group.id);
    try {
      await requestDashboardApi(`/exams/series/${encodeURIComponent(group.id)}/publish`, {
        method: "POST",
      });
      toast.success(`${group.name} report cards were published to authorized parent and student portals.`);
      await refetch();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : "Exam results could not be published.");
    } finally {
      setBusySeriesId(null);
    }
  }

  async function withdrawSeries(group: ReportCardSeriesGroup) {
    const reason = withdrawReason.trim();
    if (!reason) {
      toast.error("Enter the withdrawal reason before removing published results.");
      return;
    }

    setBusySeriesId(group.id);
    try {
      await requestDashboardApi(`/exams/series/${encodeURIComponent(group.id)}/unpublish`, {
        method: "POST",
        body: { reason },
      });
      toast.success(`${group.name} results were withdrawn and the academic audit trail was updated.`);
      setWithdrawSeriesId(null);
      setWithdrawReason("");
      await refetch();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : "Published results could not be withdrawn.");
    } finally {
      setBusySeriesId(null);
    }
  }

  return (
    <Panel
      title="Exams & Report Cards"
      description="Release only Dean-approved report-card series. Published records become visible through authorized parent and student portals; withdrawal requires a recorded reason."
      icon={Award}
    >
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Approved for release</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : approvedCards}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Learners ready</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : learnersReady}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Currently published</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : publishedCards}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Withdrawn revisions</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : withdrawnCards}</div>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          Principal release queue could not be loaded: {error.message}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Exam series</th>
              <th className="px-4 py-3 font-bold">Term</th>
              <th className="px-4 py-3 font-bold">Report cards</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Learners</th>
              <th className="px-4 py-3 text-right font-bold">Principal action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">
                  Loading Principal release queue...
                </td>
              </tr>
            ) : seriesGroups.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">
                  No report-card series is ready for Principal action. The Exams Manager must generate and submit cards, then the Dean must approve them.
                </td>
              </tr>
            ) : (
              seriesGroups.map((group) => {
                const withdrawing = withdrawSeriesId === group.id;
                const learnerNames = group.cards
                  .map((card) => card.student_name || card.admission_number)
                  .filter(Boolean)
                  .slice(0, 3);

                return (
                  <tr key={group.id} className="border-t border-[#D8E0EC] align-top hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 text-[#64748B]">
                      <div className="font-bold text-[#071D49]">{group.name}</div>
                      <div>{group.id}</div>
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">
                      {[group.term, group.academicYear].filter(Boolean).join(" - ") || "Not assigned"}
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">
                      <div>{group.cards.length} current card(s)</div>
                      <div>{group.approved} approved, {group.published} published</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusChip label={groupStatus(group)} tone={groupTone(group)} />
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">
                      {learnerNames.length ? learnerNames.join(", ") : `${group.cards.length} learner(s)`}
                      {group.cards.length > learnerNames.length && learnerNames.length
                        ? ` +${group.cards.length - learnerNames.length} more`
                        : ""}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {group.approved > 0 ? (
                        <button
                          type="button"
                          onClick={() => publishSeries(group)}
                          disabled={Boolean(busySeriesId)}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                        >
                          {busySeriesId === group.id ? "Publishing..." : "Publish approved series"}
                        </button>
                      ) : group.published > 0 && !withdrawing ? (
                        <button
                          type="button"
                          onClick={() => {
                            setWithdrawSeriesId(group.id);
                            setWithdrawReason("");
                          }}
                          disabled={Boolean(busySeriesId)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 disabled:opacity-50"
                        >
                          Withdraw published series
                        </button>
                      ) : withdrawing ? (
                        <div className="ml-auto flex max-w-sm flex-col gap-2">
                          <label htmlFor={`withdraw-${group.id}`} className="text-left text-xs font-bold text-[#475569]">
                            Required withdrawal reason
                          </label>
                          <textarea
                            id={`withdraw-${group.id}`}
                            value={withdrawReason}
                            onChange={(event) => setWithdrawReason(event.target.value)}
                            rows={2}
                            className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#071D49]"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setWithdrawSeriesId(null);
                                setWithdrawReason("");
                              }}
                              disabled={busySeriesId === group.id}
                              className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-black text-[#475569]"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => withdrawSeries(group)}
                              disabled={busySeriesId === group.id || !withdrawReason.trim()}
                              className="rounded-lg bg-red-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                            >
                              {busySeriesId === group.id ? "Withdrawing..." : "Confirm withdrawal"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-[#64748B]">
                          Generate a corrected revision before release.
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
