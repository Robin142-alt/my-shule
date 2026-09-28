"use client";

import { useState } from "react";
import { CheckCircle2, Fingerprint } from "lucide-react";
import { toast } from "sonner";

import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";
import { AdmissionsEmptyStateCell, APPLICATIONS_HREF } from "./empty-state-cell";

type AdmissionsRecord = {
  id: string;
  student_name: string;
  application_date: string;
  class_applied: string;
  parent_name: string;
  phone: string;
  status: string;
  admission_number?: string;
};

type AdmissionsData = {
  metrics?: {
    total_applicants?: number;
    admitted?: number;
    pending?: number;
    rejected?: number;
  };
  admissionsList?: AdmissionsRecord[];
};

function normalizedStatus(status: string) {
  return status.trim().toLowerCase().replace(/\s+/g, "_");
}

export function AdmissionsEnrolmentWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<AdmissionsData>("/admin-command/admissions/admissions");
  const enrolMutation = useSchoolMutation<Record<string, unknown>, string>(
    (id) => `/admin-command/admissions/admissions/${id}/admit`,
    "POST",
  );
  const [actioningId, setActioningId] = useState<string | null>(null);

  const candidates = (data?.admissionsList ?? []).filter((candidate) =>
    ["approved", "registered", "admitted"].includes(normalizedStatus(candidate.status)),
  );

  async function handleEnrol(candidate: AdmissionsRecord) {
    setActioningId(candidate.id);
    try {
      await enrolMutation.mutateAsync(candidate.id);
      toast.success(`${candidate.student_name} enrolled and admission number generated.`);
      await refetch();
    } catch {
      toast.error("Could not complete enrolment.");
    } finally {
      setActioningId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-info-soft text-info">
            <Fingerprint className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-black tracking-[-0.01em] text-foreground">
              Enrolment & Admission Numbers
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Finalize approved applications, create student records, and generate admission numbers.
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit rounded-full border border-success-border bg-success-soft px-3 py-1 text-xs font-black text-success">
          {isLoading ? "Loading..." : `${candidates.length} ready for enrolment`}
        </span>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Total Applicants</div>
          <div className="mt-1 text-lg font-black text-foreground">
            {isLoading ? "..." : data?.metrics?.total_applicants ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Ready</div>
          <div className="mt-1 text-lg font-black text-success">
            {isLoading ? "..." : candidates.length}
          </div>
        </div>
        <div className="rounded-xl border border-info-border bg-info-soft p-4">
          <div className="text-sm font-semibold text-info">Admitted</div>
          <div className="mt-1 text-lg font-black text-info">
            {isLoading ? "..." : data?.metrics?.admitted ?? 0}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold">Learner</th>
              <th className="px-4 py-3 font-bold">Class</th>
              <th className="px-4 py-3 font-bold">Guardian</th>
              <th className="px-4 py-3 font-bold">Phone</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 text-right font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">Loading enrolment queue...</td></tr>
            ) : candidates.length === 0 ? (
              <AdmissionsEmptyStateCell
                colSpan={6}
                title="No approved applications are ready for enrolment"
                body="Approve an application from Applications first, then return here to generate the admission number."
                actionHref={APPLICATIONS_HREF}
                actionLabel="Review applications"
              />
            ) : (
              candidates.map((candidate) => {
                const status = normalizedStatus(candidate.status);
                const alreadyEnrolled = ["registered", "admitted"].includes(status);
                return (
                  <tr key={candidate.id} className="border-t border-border hover:bg-surface-muted">
                    <td className="px-4 py-3 font-bold text-foreground">{candidate.student_name}</td>
                    <td className="px-4 py-3 text-muted">{candidate.class_applied}</td>
                    <td className="px-4 py-3 text-muted">{candidate.parent_name}</td>
                    <td className="px-4 py-3 text-muted">{candidate.phone}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-success-border bg-success-soft px-3 py-1 text-xs font-bold text-success">
                        {candidate.status}
                      </span>
                      {alreadyEnrolled && candidate.admission_number ? (
                        <div className="mt-1 text-xs font-bold text-muted">
                          Admission no. {candidate.admission_number}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {alreadyEnrolled ? (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-success-border bg-success-soft px-3 py-1.5 text-xs font-black text-success">
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          Enrolled
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={actioningId === candidate.id}
                          onClick={() => handleEnrol(candidate)}
                          aria-label={`Enrol ${candidate.student_name}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-white disabled:opacity-60"
                        >
                          <Fingerprint className="h-3 w-3" aria-hidden="true" />
                          Enrol
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
