"use client";

import { FormEvent, useState } from "react";
import { CheckCircle, ClipboardList, FileInput, Search, XCircle } from "lucide-react";
import { toast } from "sonner";

import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";

type ApplicationRecord = {
  id: string;
  student_name: string;
  guardian_name: string;
  phone: string;
  grade_applied: string;
  previous_school?: string;
  status: string;
  submitted_at: string;
};

type ApplicationsData = {
  metrics?: {
    total?: number;
    pending?: number;
    approved?: number;
    rejected?: number;
  };
  applicationsList?: ApplicationRecord[];
  items?: ApplicationRecord[];
};

type ApplicationFormState = {
  full_name: string;
  date_of_birth: string;
  gender: string;
  birth_certificate_number: string;
  nationality: string;
  class_applying: string;
  previous_school: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  relationship: string;
  emergency_contact: string;
};

const emptyApplicationForm: ApplicationFormState = {
  full_name: "",
  date_of_birth: "",
  gender: "",
  birth_certificate_number: "",
  nationality: "Kenyan",
  class_applying: "",
  previous_school: "",
  parent_name: "",
  parent_phone: "",
  parent_email: "",
  relationship: "Guardian",
  emergency_contact: "",
};

function normalizeStatus(status: string) {
  return status.trim().toLowerCase().replace(/\s+/g, "_");
}

function statusTone(status: string) {
  const normalized = normalizeStatus(status);
  if (["approved", "registered", "admitted"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["rejected"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (["reviewing", "interview", "interview_scheduled"].includes(normalized)) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function requiredFieldsMissing(form: ApplicationFormState) {
  return [
    ["Student full name", form.full_name],
    ["Date of birth", form.date_of_birth],
    ["Gender", form.gender],
    ["Birth certificate number", form.birth_certificate_number],
    ["Class applying", form.class_applying],
    ["Guardian name", form.parent_name],
    ["Guardian phone", form.parent_phone],
  ]
    .filter(([, value]) => !String(value).trim())
    .map(([label]) => label);
}

export function ApplicationsWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<ApplicationsData>("/admin-command/admissions/applications");
  const createApplication = useSchoolMutation<Record<string, unknown>, ApplicationFormState>(
    "/admin-command/admissions/applications",
    "POST",
  );
  const updateApplicationStatus = useSchoolMutation<Record<string, unknown>, { id: string; status: string }>(
    ({ id }) => `/admin-command/admissions/applications/${id}/status`,
    "POST",
  );
  const scheduleInterview = useSchoolMutation<Record<string, unknown>, { application_id: string; interview_date: string; start_time: string; end_time: string; location: string }>(
    "/admin-command/admissions/interviews",
    "POST",
  );

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ApplicationFormState>(emptyApplicationForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const applications = (data?.applicationsList ?? data?.items ?? []).filter((application) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return [
      application.student_name,
      application.guardian_name,
      application.phone,
      application.grade_applied,
      application.status,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle));
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const missing = requiredFieldsMissing(form);
    if (missing.length > 0) {
      setFormError(`${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required.`);
      return;
    }

    setFormError(null);
    try {
      await createApplication.mutateAsync({
        ...form,
        full_name: form.full_name.trim(),
        class_applying: form.class_applying.trim(),
        parent_name: form.parent_name.trim(),
        parent_phone: form.parent_phone.trim(),
        parent_email: form.parent_email.trim(),
        previous_school: form.previous_school.trim(),
        emergency_contact: form.emergency_contact.trim(),
      });
      toast.success("Admission application created and queued for review.");
      setForm(emptyApplicationForm);
      setFormOpen(false);
      await refetch();
    } catch {
      setFormError("Admission could not be saved. Check the details and try again.");
      toast.error("Admission could not be saved.");
    }
  }

  async function moveStage(application: ApplicationRecord, status: string) {
    setActioningId(application.id);
    try {
      await updateApplicationStatus.mutateAsync({ id: application.id, status });
      toast.success(`${application.student_name} moved to ${status.replace("_", " ")}.`);
      await refetch();
    } catch {
      toast.error("Could not move the application to the next stage.");
    } finally {
      setActioningId(null);
    }
  }

  async function quickScheduleInterview(application: ApplicationRecord) {
    setActioningId(application.id);
    try {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      await scheduleInterview.mutateAsync({
        application_id: application.id,
        interview_date: tomorrow,
        start_time: "09:00",
        end_time: "09:30",
        location: "Admissions office",
      });
      toast.success(`Interview scheduled for ${application.student_name}.`);
      await refetch();
    } catch {
      toast.error("Could not schedule the interview.");
    } finally {
      setActioningId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
            <FileInput className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-black tracking-[-0.01em] text-[#071D49]">Applications</h2>
            <p className="mt-1 text-sm leading-6 text-[#64748B]">
              Start learner admission, review applications, schedule interviews, approve, reject, and hand off to enrolment.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative block">
            <span className="sr-only">Search applications</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search applications"
              className="w-full rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] py-2 pl-9 pr-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-cyan-300 sm:w-56"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setFormOpen((open) => !open);
            }}
            className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-[#0B2B6A]"
          >
            Start student admission
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total ?? 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-700">Pending Review</div>
          <div className="mt-1 text-lg font-black text-amber-700">{isLoading ? "..." : data?.metrics?.pending ?? 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Approved</div>
          <div className="mt-1 text-lg font-black text-emerald-700">{isLoading ? "..." : data?.metrics?.approved ?? 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Rejected</div>
          <div className="mt-1 text-lg font-black text-rose-700">{isLoading ? "..." : data?.metrics?.rejected ?? 0}</div>
        </div>
      </div>

      {formOpen ? (
        <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4">
          <div className="mb-4">
            <h3 className="text-lg font-black text-[#071D49]">New student admission</h3>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">
              This creates a tenant-scoped admission application. Move it through review, interview, approval, and enrolment from this dashboard.
            </p>
          </div>
          {formError ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
              {formError}
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="grid gap-1 text-sm font-bold text-[#071D49]">
              Student full name
              <input className="rounded-xl border border-[#D8E0EC] bg-white px-3 py-2" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
            </label>
            <label className="grid gap-1 text-sm font-bold text-[#071D49]">
              Date of birth
              <input type="date" className="rounded-xl border border-[#D8E0EC] bg-white px-3 py-2" value={form.date_of_birth} onChange={(event) => setForm({ ...form, date_of_birth: event.target.value })} />
            </label>
            <label className="grid gap-1 text-sm font-bold text-[#071D49]">
              Gender
              <select className="rounded-xl border border-[#D8E0EC] bg-white px-3 py-2" value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}>
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold text-[#071D49]">
              Birth certificate number
              <input className="rounded-xl border border-[#D8E0EC] bg-white px-3 py-2" value={form.birth_certificate_number} onChange={(event) => setForm({ ...form, birth_certificate_number: event.target.value })} />
            </label>
            <label className="grid gap-1 text-sm font-bold text-[#071D49]">
              Class applying
              <input className="rounded-xl border border-[#D8E0EC] bg-white px-3 py-2" value={form.class_applying} onChange={(event) => setForm({ ...form, class_applying: event.target.value })} />
            </label>
            <label className="grid gap-1 text-sm font-bold text-[#071D49]">
              Previous school
              <input className="rounded-xl border border-[#D8E0EC] bg-white px-3 py-2" value={form.previous_school} onChange={(event) => setForm({ ...form, previous_school: event.target.value })} />
            </label>
            <label className="grid gap-1 text-sm font-bold text-[#071D49]">
              Guardian name
              <input className="rounded-xl border border-[#D8E0EC] bg-white px-3 py-2" value={form.parent_name} onChange={(event) => setForm({ ...form, parent_name: event.target.value })} />
            </label>
            <label className="grid gap-1 text-sm font-bold text-[#071D49]">
              Guardian phone
              <input className="rounded-xl border border-[#D8E0EC] bg-white px-3 py-2" value={form.parent_phone} onChange={(event) => setForm({ ...form, parent_phone: event.target.value })} />
            </label>
            <label className="grid gap-1 text-sm font-bold text-[#071D49]">
              Guardian email
              <input type="email" className="rounded-xl border border-[#D8E0EC] bg-white px-3 py-2" value={form.parent_email} onChange={(event) => setForm({ ...form, parent_email: event.target.value })} />
            </label>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-black text-[#071D49]">
              Cancel
            </button>
            <button type="submit" disabled={createApplication.isPending} className="rounded-xl bg-[#FF6B1A] px-4 py-2 text-sm font-black text-white disabled:opacity-60">
              {createApplication.isPending ? "Saving..." : "Save application"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Applicant</th>
              <th className="px-4 py-3 font-bold">Date</th>
              <th className="px-4 py-3 font-bold">Class</th>
              <th className="px-4 py-3 font-bold">Guardian</th>
              <th className="px-4 py-3 font-bold">Phone</th>
              <th className="px-4 py-3 font-bold">Stage</th>
              <th className="px-4 py-3 text-right font-bold">Next action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading applications...</td></tr>
            ) : applications.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">
                  No admissions have started yet. Use Start student admission to capture the first learner, then move the application through review, interview, approval, and enrolment.
                </td>
              </tr>
            ) : (
              applications.map((row) => {
                const normalized = normalizeStatus(row.status);
                return (
                  <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-bold text-[#071D49]">{row.student_name}</td>
                    <td className="px-4 py-3 text-[#64748B]">{row.submitted_at}</td>
                    <td className="px-4 py-3 text-[#64748B]">{row.grade_applied}</td>
                    <td className="px-4 py-3 text-[#64748B]">{row.guardian_name}</td>
                    <td className="px-4 py-3 text-[#64748B]">{row.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold ${statusTone(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {normalized === "pending" ? (
                          <button
                            type="button"
                            disabled={actioningId === row.id}
                            onClick={() => moveStage(row, "reviewing")}
                            aria-label={`Start review for ${row.student_name}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 disabled:opacity-60"
                          >
                            <ClipboardList className="h-3 w-3" aria-hidden="true" />
                            Start review
                          </button>
                        ) : null}
                        {normalized === "reviewing" ? (
                          <button
                            type="button"
                            disabled={actioningId === row.id}
                            onClick={() => quickScheduleInterview(row)}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 disabled:opacity-60"
                          >
                            Schedule interview
                          </button>
                        ) : null}
                        {["interview", "interview_scheduled", "reviewing"].includes(normalized) ? (
                          <button
                            type="button"
                            disabled={actioningId === row.id}
                            onClick={() => moveStage(row, "approved")}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 disabled:opacity-60"
                          >
                            <CheckCircle className="h-3 w-3" aria-hidden="true" />
                            Approve for enrolment
                          </button>
                        ) : null}
                        {!["rejected", "registered", "admitted"].includes(normalized) ? (
                          <button
                            type="button"
                            disabled={actioningId === row.id}
                            onClick={() => moveStage(row, "rejected")}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 disabled:opacity-60"
                          >
                            <XCircle className="h-3 w-3" aria-hidden="true" />
                            Reject
                          </button>
                        ) : null}
                        {normalized === "approved" ? (
                          <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                            Ready in Enrolment
                          </span>
                        ) : null}
                      </div>
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
