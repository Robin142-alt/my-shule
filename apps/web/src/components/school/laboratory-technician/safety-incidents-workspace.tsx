"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, ClipboardCheck, Plus, ShieldCheck } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { useSchoolQuery } from "@/lib/data/school-hooks";

import { LabQuickActions, Panel, SaveState, StatusChip, WorkspaceEmpty, WorkspaceError } from "./shared";
import type {
  LabBreakageLoss,
  LabInventoryData,
  LabSafetyCheck,
  LaboratoryActionResponse,
} from "./types";
import { formatKenyanDate, statusTone } from "./types";
import { createSubmissionId, isPendingSync, useLaboratoryMutation } from "./use-laboratory-mutation";

type Tab = "breakage" | "safety";
type BreakageForm = {
  itemKey: string;
  itemName: string;
  quantity: string;
  date: string;
  practicalOrActivity: string;
  className: string;
  teacherName: string;
  classification: string;
  explanation: string;
  referForFollowUp: boolean;
  submissionId: string;
};

const safetyItems = [
  "Safety goggles, coats and gloves are ready",
  "First aid box and eye-wash supplies are available",
  "Fire extinguishers are accessible and in date",
  "Chemicals are labelled and stored safely",
  "Spill kit and waste containers are ready",
  "Doors, exits and walkways are clear",
  "Gas, electricity and water points are safe",
  "Ventilation and lighting are working",
];

const fieldClass =
  "min-h-12 w-full rounded-xl border border-[#C8D5EA] bg-white px-3 text-base text-[#071D49] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function kenyanDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function emptyBreakageForm(): BreakageForm {
  return {
    itemKey: "",
    itemName: "",
    quantity: "",
    date: kenyanDate(),
    practicalOrActivity: "",
    className: "",
    teacherName: "",
    classification: "accidental_breakage",
    explanation: "",
    referForFollowUp: false,
    submissionId: createSubmissionId("lab-breakage"),
  };
}

const classificationLabels: Record<string, string> = {
  accidental_breakage: "Accidental Breakage",
  wear_and_tear: "Wear and Tear",
  equipment_failure: "Equipment Failure",
  missing: "Missing",
  chemical_spill: "Chemical Spill",
  improper_use: "Improper Use",
  unknown: "Unknown",
};

export function SafetyIncidentsWorkspace() {
  const [tab, setTab] = useState<Tab>("breakage");
  const [breakageOpen, setBreakageOpen] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [breakageForm, setBreakageForm] = useState<BreakageForm>(() => emptyBreakageForm());
  const [locationName, setLocationName] = useState("");
  const [checkedOn, setCheckedOn] = useState(() => kenyanDate());
  const [nextDueDate, setNextDueDate] = useState(() => kenyanDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)));
  const [checklist, setChecklist] = useState(() => safetyItems.map((label) => ({ label, checked: true, note: "" })));
  const [safetyNotes, setSafetyNotes] = useState("");
  const [safetySubmissionId, setSafetySubmissionId] = useState(() => createSubmissionId("lab-safety-check"));
  const [saveState, setSaveState] = useState<"saved" | "saving" | "failed" | "pending_sync" | null>(null);
  const [notice, setNotice] = useState("");

  const inventoryQuery = useSchoolQuery<LabInventoryData>("/labs/inventory");
  const breakageQuery = useSchoolQuery<LabBreakageLoss[]>("/labs/breakage-loss");
  const safetyQuery = useSchoolQuery<LabSafetyCheck[]>("/labs/safety-checks");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const action = new URLSearchParams(window.location.search).get("action");
    if (action === "breakage") {
      setTab("breakage");
      setBreakageOpen(true);
    }
    if (action === "safety") {
      setTab("safety");
      setSafetyOpen(true);
    }
  }, []);

  const inventoryItems = inventoryQuery.data?.items ?? [];
  const breakages = breakageQuery.data ?? [];
  const safetyChecks = safetyQuery.data ?? [];
  const unresolvedCount = breakages.filter((entry) => entry.status === "unresolved").length;
  const dueChecks = safetyChecks.filter((entry) => entry.status.toLowerCase() === "due" || entry.status === "follow_up_required").length;

  const selectedItem = useMemo(
    () => inventoryItems.find((item) => `${item.item_source}:${item.id}` === breakageForm.itemKey) ?? null,
    [breakageForm.itemKey, inventoryItems],
  );

  const breakageMutation = useLaboratoryMutation<LaboratoryActionResponse<{ record: LabBreakageLoss }>, Record<string, unknown>>({
    action: "record-breakage-loss",
    path: "/labs/breakage-loss",
    onMutate: () => {
      setSaveState("saving");
      setNotice("");
    },
    onSuccess: (response) => {
      if (isPendingSync(response)) {
        setSaveState("pending_sync");
        setNotice("This breakage or loss is pending sync. No school record or stock change is claimed yet.");
        return;
      }
      setSaveState("saved");
      setNotice(response.message);
      setBreakageOpen(false);
      setBreakageForm(emptyBreakageForm());
    },
    onError: () => setSaveState("failed"),
  });

  const safetyMutation = useLaboratoryMutation<LaboratoryActionResponse<{ check: LabSafetyCheck }>, Record<string, unknown>>({
    action: "save-safety-check",
    path: "/labs/safety-checks",
    onMutate: () => {
      setSaveState("saving");
      setNotice("");
    },
    onSuccess: (response) => {
      if (isPendingSync(response)) {
        setSaveState("pending_sync");
        setNotice("The checklist is saved on this device and is pending sync. It is not yet a confirmed school record.");
        return;
      }
      setSaveState("saved");
      setNotice(response.message);
      setSafetyOpen(false);
      setChecklist(safetyItems.map((label) => ({ label, checked: true, note: "" })));
      setSafetyNotes("");
      setSafetySubmissionId(createSubmissionId("lab-safety-check"));
    },
    onError: () => setSaveState("failed"),
  });

  function submitBreakage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quantity = Number(breakageForm.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    breakageMutation.mutate({
      item_id: selectedItem?.id,
      item_source: selectedItem?.item_source,
      item_name: breakageForm.itemName.trim(),
      quantity,
      date: breakageForm.date,
      practical_or_activity: breakageForm.practicalOrActivity.trim() || undefined,
      class_name: breakageForm.className.trim() || undefined,
      teacher_name: breakageForm.teacherName.trim() || undefined,
      classification: breakageForm.classification,
      explanation: breakageForm.explanation.trim(),
      refer_for_follow_up: breakageForm.referForFollowUp,
      submission_id: breakageForm.submissionId,
    });
  }

  function submitSafetyCheck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    safetyMutation.mutate({
      location_name: locationName.trim(),
      checked_on: checkedOn,
      next_due_date: nextDueDate,
      checklist,
      notes: safetyNotes.trim() || undefined,
      submission_id: safetySubmissionId,
    });
  }

  const loadError = tab === "breakage" ? breakageQuery.error : safetyQuery.error;
  const isLoading = tab === "breakage" ? breakageQuery.isLoading : safetyQuery.isLoading;

  return (
    <div className="space-y-5">
      <LabQuickActions compact />
      {notice ? <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-950">{notice}</div> : null}
      <SaveState state={saveState} />

      <Panel
        title="Safety, Breakage and Loss"
        description="Keep the familiar breakage register and safety checklist together. Recording an incident never creates a charge."
        icon={AlertTriangle}
        actions={
          <button
            type="button"
            onClick={() => tab === "breakage" ? setBreakageOpen(true) : setSafetyOpen(true)}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-[#0F3F8A] px-4 text-sm font-black text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> {tab === "breakage" ? "Record Breakage or Loss" : "Start Safety Check"}
          </button>
        }
      >
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Laboratory safety records">
          <button type="button" role="tab" aria-selected={tab === "breakage"} onClick={() => setTab("breakage")} className={`min-h-12 rounded-lg px-3 text-sm font-black ${tab === "breakage" ? "bg-white text-[#071D49] shadow-sm" : "text-[#64748B]"}`}>
            Breakage &amp; Loss ({unresolvedCount})
          </button>
          <button type="button" role="tab" aria-selected={tab === "safety"} onClick={() => setTab("safety")} className={`min-h-12 rounded-lg px-3 text-sm font-black ${tab === "safety" ? "bg-white text-[#071D49] shadow-sm" : "text-[#64748B]"}`}>
            Safety Checklist ({dueChecks} due)
          </button>
        </div>

        {loadError ? (
          <WorkspaceError message={loadError.message} onRetry={() => void (tab === "breakage" ? breakageQuery.refetch() : safetyQuery.refetch())} />
        ) : isLoading ? (
          <p className="py-10 text-center text-sm text-[#64748B]">Loading laboratory records…</p>
        ) : tab === "breakage" ? (
          breakages.length === 0 ? (
            <WorkspaceEmpty
              title="No breakages or losses have been recorded"
              description="Record broken, damaged, missing or spilled items here. MyShule will keep the entry in the school register without charging a learner or teacher."
              actions={<button type="button" onClick={() => setBreakageOpen(true)} className="min-h-11 rounded-xl bg-[#0F3F8A] px-4 font-black text-white">Record the First Entry</button>}
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {breakages.map((entry) => (
                <article key={entry.id} className="rounded-xl border border-[#D8E0EC] bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><h3 className="font-black text-[#071D49]">{entry.item_name}</h3><p className="mt-1 text-sm text-[#64748B]">{entry.quantity} · {formatKenyanDate(entry.date)}</p></div>
                    <StatusChip label={entry.status === "unresolved" ? "Unresolved" : entry.status} tone={statusTone(entry.status)} />
                  </div>
                  <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                    <div><dt className="text-[#64748B]">Classification</dt><dd className="font-bold text-[#071D49]">{classificationLabels[entry.classification] ?? entry.classification}</dd></div>
                    <div><dt className="text-[#64748B]">Practical or Activity</dt><dd className="font-bold text-[#071D49]">{entry.practical_or_activity || "Not linked"}</dd></div>
                    <div><dt className="text-[#64748B]">Class and Teacher</dt><dd className="font-bold text-[#071D49]">{[entry.class_name, entry.teacher_name].filter(Boolean).join(" · ") || "Not recorded"}</dd></div>
                    <div><dt className="text-[#64748B]">Follow-up</dt><dd className="font-bold text-[#071D49]">{entry.referral_required ? entry.referral_status || "Referred" : "No referral"}</dd></div>
                    <div><dt className="text-[#64748B]">Recorded By</dt><dd className="font-bold text-[#071D49]">{entry.recorded_by || "School laboratory staff"}</dd></div>
                  </dl>
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-[#334155]">{entry.explanation}</p>
                </article>
              ))}
            </div>
          )
        ) : safetyChecks.length === 0 ? (
          <WorkspaceEmpty
            title="No safety checklist has been completed"
            description="Check each laboratory or store and set the next inspection date. Unchecked items remain visible for follow-up."
            actions={<button type="button" onClick={() => setSafetyOpen(true)} className="min-h-11 rounded-xl bg-[#0F3F8A] px-4 font-black text-white">Complete First Checklist</button>}
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {safetyChecks.map((check) => {
              const completed = check.checklist.filter((item) => item.checked).length;
              return (
                <article key={check.id} className="rounded-xl border border-[#D8E0EC] bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><h3 className="flex items-center gap-2 font-black text-[#071D49]"><ShieldCheck className="h-4 w-4" aria-hidden="true" />{check.location_name}</h3><p className="mt-1 text-sm text-[#64748B]">Checked {formatKenyanDate(check.checked_on)}</p></div>
                    <StatusChip label={check.status === "follow_up_required" ? "Follow-up Required" : check.status} tone={check.status === "completed" ? "success" : "warning"} />
                  </div>
                  <p className="mt-4 text-sm text-[#334155]">{completed} of {check.checklist.length} safety points passed.</p>
                  <p className="mt-1 text-sm font-bold text-[#071D49]">Next check: {formatKenyanDate(check.next_due_date)}</p>
                  {check.notes ? <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-[#334155]">{check.notes}</p> : null}
                </article>
              );
            })}
          </div>
        )}
      </Panel>

      <Modal
        open={breakageOpen}
        title="Record Breakage or Loss"
        description="Add the register entry directly. No charge is created."
        onClose={() => setBreakageOpen(false)}
        size="lg"
        mobileFullScreen
        footer={
          <>
            <button type="button" onClick={() => setBreakageOpen(false)} className="min-h-12 rounded-xl border border-[#C8D5EA] px-4 font-black text-[#071D49]">Cancel</button>
            <button type="submit" form="laboratory-breakage-form" disabled={breakageMutation.isPending} className="min-h-12 rounded-xl bg-[#0F3F8A] px-5 font-black text-white disabled:opacity-50">{breakageMutation.isPending ? "Saving…" : "Record Breakage or Loss"}</button>
          </>
        }
      >
        <form id="laboratory-breakage-form" onSubmit={submitBreakage} className="space-y-4">
          <label className="block text-sm font-bold text-[#071D49]">
            Select Item (optional)
            <select
              value={breakageForm.itemKey}
              onChange={(event) => {
                const item = inventoryItems.find((entry) => `${entry.item_source}:${entry.id}` === event.target.value);
                setBreakageForm((current) => ({ ...current, itemKey: event.target.value, itemName: item?.item_name ?? current.itemName }));
              }}
              className={`${fieldClass} mt-2`}
            >
              <option value="">Type the item name below</option>
              {inventoryItems.map((item) => <option key={`${item.item_source}:${item.id}`} value={`${item.item_source}:${item.id}`}>{item.item_name} — {item.storage_location || "Location not set"}</option>)}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold text-[#071D49]">Item Name<input required value={breakageForm.itemName} onChange={(event) => setBreakageForm((current) => ({ ...current, itemName: event.target.value }))} className={`${fieldClass} mt-2`} /></label>
            <label className="text-sm font-bold text-[#071D49]">Quantity<input required type="number" min="0.001" step="any" inputMode="decimal" value={breakageForm.quantity} onChange={(event) => setBreakageForm((current) => ({ ...current, quantity: event.target.value }))} className={`${fieldClass} mt-2`} /></label>
            <label className="text-sm font-bold text-[#071D49]">Date<input required inputMode="numeric" placeholder="DD/MM/YYYY" value={breakageForm.date} onChange={(event) => setBreakageForm((current) => ({ ...current, date: event.target.value }))} className={`${fieldClass} mt-2`} /></label>
            <label className="text-sm font-bold text-[#071D49]">Classification<select value={breakageForm.classification} onChange={(event) => setBreakageForm((current) => ({ ...current, classification: event.target.value }))} className={`${fieldClass} mt-2`}>{Object.entries(classificationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="text-sm font-bold text-[#071D49]">Practical or Activity<input value={breakageForm.practicalOrActivity} onChange={(event) => setBreakageForm((current) => ({ ...current, practicalOrActivity: event.target.value }))} className={`${fieldClass} mt-2`} /></label>
            <label className="text-sm font-bold text-[#071D49]">Class and Stream<input value={breakageForm.className} onChange={(event) => setBreakageForm((current) => ({ ...current, className: event.target.value }))} className={`${fieldClass} mt-2`} placeholder="Form 3 East" /></label>
            <label className="text-sm font-bold text-[#071D49] sm:col-span-2">Teacher Responsible for the Lesson<input value={breakageForm.teacherName} onChange={(event) => setBreakageForm((current) => ({ ...current, teacherName: event.target.value }))} className={`${fieldClass} mt-2`} /></label>
          </div>
          <label className="block text-sm font-bold text-[#071D49]">Brief Explanation<textarea required rows={3} value={breakageForm.explanation} onChange={(event) => setBreakageForm((current) => ({ ...current, explanation: event.target.value }))} className={`${fieldClass} mt-2 py-3`} /></label>
          <label className="flex items-start gap-3 rounded-xl border border-[#D8E0EC] p-4 text-sm text-[#334155]">
            <input type="checkbox" checked={breakageForm.referForFollowUp} onChange={(event) => setBreakageForm((current) => ({ ...current, referForFollowUp: event.target.checked }))} className="mt-1 h-5 w-5" />
            <span><strong className="block text-[#071D49]">Refer for school follow-up</strong>Create a leadership review task where needed. The technician does not make disciplinary or financial decisions.</span>
          </label>
        </form>
      </Modal>

      <Modal
        open={safetyOpen}
        title="Laboratory Safety Checklist"
        description="Check the location and leave any failed point unticked for follow-up."
        onClose={() => setSafetyOpen(false)}
        size="lg"
        mobileFullScreen
        footer={
          <>
            <button type="button" onClick={() => setSafetyOpen(false)} className="min-h-12 rounded-xl border border-[#C8D5EA] px-4 font-black text-[#071D49]">Cancel</button>
            <button type="submit" form="laboratory-safety-check-form" disabled={safetyMutation.isPending} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 font-black text-white disabled:opacity-50"><ClipboardCheck className="h-5 w-5" aria-hidden="true" />{safetyMutation.isPending ? "Saving…" : "Save Safety Checklist"}</button>
          </>
        }
      >
        <form id="laboratory-safety-check-form" onSubmit={submitSafetyCheck} className="space-y-4">
          <label className="block text-sm font-bold text-[#071D49]">Laboratory or Store<input required list="lab-safety-locations" value={locationName} onChange={(event) => setLocationName(event.target.value)} className={`${fieldClass} mt-2`} /><datalist id="lab-safety-locations">{(inventoryQuery.data?.locations ?? []).map((location) => <option key={location.id} value={location.full_path} />)}</datalist></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold text-[#071D49]">Date Checked<input required inputMode="numeric" placeholder="DD/MM/YYYY" value={checkedOn} onChange={(event) => setCheckedOn(event.target.value)} className={`${fieldClass} mt-2`} /></label>
            <label className="text-sm font-bold text-[#071D49]">Next Check Due<input required inputMode="numeric" placeholder="DD/MM/YYYY" value={nextDueDate} onChange={(event) => setNextDueDate(event.target.value)} className={`${fieldClass} mt-2`} /></label>
          </div>
          <fieldset className="space-y-2"><legend className="mb-2 font-black text-[#071D49]">Safety Points</legend>{checklist.map((item, index) => <label key={item.label} className={`flex min-h-12 items-start gap-3 rounded-xl border p-3 text-sm ${item.checked ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-amber-200 bg-amber-50 text-amber-950"}`}><input type="checkbox" checked={item.checked} onChange={(event) => setChecklist((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, checked: event.target.checked } : entry))} className="mt-0.5 h-5 w-5" /><span>{item.label}</span></label>)}</fieldset>
          <label className="block text-sm font-bold text-[#071D49]">Safety Notes (optional)<textarea rows={3} value={safetyNotes} onChange={(event) => setSafetyNotes(event.target.value)} className={`${fieldClass} mt-2 py-3`} placeholder="Explain any item that needs follow-up." /></label>
        </form>
      </Modal>
    </div>
  );
}
