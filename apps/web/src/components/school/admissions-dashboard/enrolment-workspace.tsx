"use client";

import { useState } from "react";
import { CheckCircle2, Fingerprint } from "lucide-react";
import { toast } from "sonner";

import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";

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
    (id) => `/api/admissions/applications/${id}/enrol`,
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
    <section className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
            <Fingerprint className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-black tracking-[-0.01em] text-[#071D49]">
              Enrolment & Admission Numbers
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#64748B]">
              Finalize approved applications, create student records, and generate admission numbers.
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
          {isLoading ? "Loading..." : `${candidates.length} ready for enrolment`}
        </span>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Applicants</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">
            {isLoading ? "..." : data?.metrics?.total_applicants ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Ready</div>
          <div className="mt-1 text-lg font-black text-emerald-700">
            {isLoading ? "..." : candidates.length}
          </div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm font-semibold text-blue-700">Admitted</div>
          <div className="mt-1 text-lg font-black text-blue-700">
            {isLoading ? "..." : data?.metrics?.admitted ?? 0}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
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
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">Loading enrolment queue...</td></tr>
            ) : candidates.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">
                  No approved applications are ready for enrolment. Approve an application from Applications first, then return here to generate the admission number.
                </td>
              </tr>
            ) : (
              candidates.map((candidate) => {
                const status = normalizedStatus(candidate.status);
                const alreadyEnrolled = ["registered", "admitted"].includes(status);
                return (
                  <tr key={candidate.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-bold text-[#071D49]">{candidate.student_name}</td>
                    <td className="px-4 py-3 text-[#64748B]">{candidate.class_applied}</td>
                    <td className="px-4 py-3 text-[#64748B]">{candidate.parent_name}</td>
                    <td className="px-4 py-3 text-[#64748B]">{candidate.phone}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        {candidate.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {alreadyEnrolled ? (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          Enrolled
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={actioningId === candidate.id}
                          onClick={() => handleEnrol(candidate)}
                          aria-label={`Enrol ${candidate.student_name}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#071D49] px-3 py-1.5 text-xs font-black text-white disabled:opacity-60"
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
