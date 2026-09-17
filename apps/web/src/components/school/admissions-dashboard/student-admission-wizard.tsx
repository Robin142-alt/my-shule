"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";

import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";

type AcademicYear = {
  id: string;
  name: string;
  status: string;
  is_current: boolean;
};

type ClassSection = {
  id: string;
  academic_year_id: string;
  academic_level_id: string;
  name: string;
  grade_level: string;
  curriculum: string;
  capacity: number | null;
  enrolment_open: boolean;
  student_count: number;
};

type ClassStream = {
  id: string;
  class_section_id: string;
  name: string;
  capacity: number | null;
  student_count: number;
};

type Subject = {
  id: string;
  code: string;
  name: string;
  subject_type: string;
  is_compulsory: boolean;
  is_examinable: boolean;
};

type ClassSubjectAssignment = {
  academic_term_id?: string | null;
  stream_id?: string | null;
  academic_year_id: string;
  class_section_id: string;
  subject_id: string;
  is_compulsory: boolean;
  is_examinable: boolean;
};

type AdmissionFoundation = {
  academic_years: AcademicYear[];
  classes: ClassSection[];
  streams: ClassStream[];
  subjects: Subject[];
  class_subject_assignments: ClassSubjectAssignment[];
  admission_settings: AdmissionSettings;
};

type AdmissionSettings = {
  admission_number_mode: "manual" | "automatic" | "suggested";
  admission_number_prefix: string;
  admission_number_separator: "-" | "/" | "." | "_";
  admission_number_padding: number;
  include_academic_year: boolean;
  strict_capacity: boolean;
  strict_age_rules: boolean;
  minimum_age: number | null;
  maximum_age: number | null;
  minimum_subjects: number | null;
  maximum_subjects: number | null;
  suggested_admission_number: string;
};

type AdmissionDraft = {
  payload: Partial<AdmissionPayload> & { step?: number };
  updated_at: string;
};

type AdmissionPreflight = {
  valid: boolean;
  warnings: Array<{ code: string; message: string; blocking: boolean }>;
  possible_duplicates: Array<{
    id: string;
    admission_number: string;
    full_name: string;
    status: string;
    match_reason: string;
  }>;
  guardian: null | {
    guardian_profile_id: string;
    display_name: string;
    masked_phone: string;
    children: Array<{
      student_id: string;
      admission_number: string;
      full_name: string;
      relationship: string;
      status: string;
    }>;
  };
  age_at_admission: number | null;
};

type AdmissionPayload = {
  admission_number: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  admission_date: string;
  academic_year_id: string;
  curriculum: string;
  grade_level: string;
  class_section_id: string;
  stream_id: string;
  subject_ids: string[];
  guardian_name: string;
  guardian_relationship: string;
  guardian_phone: string;
};

type AdmissionResult = {
  student: {
    id: string;
    admission_number: string;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
  };
  placement: {
    academic_year_name: string;
    class_name: string;
    stream_name?: string | null;
    capacity_warning: boolean;
    age_warning?: boolean;
    age_at_admission?: number | null;
  };
  subjects: Array<{ id: string; code: string; name: string }>;
  guardian: {
    portal_access: string;
    phone: string;
    existing_sibling_guardian: boolean;
  };
  student_portal: { username: string; status: string };
  fees: { status: string; invoice_number?: string };
  downstream_sync?: {
    status: "queued" | "degraded";
    message?: string;
  };
};

const steps = ["Student Details", "Class & Stream", "Subjects", "Guardian", "Review & Admit"];
const today = new Date().toISOString().slice(0, 10);

const emptyForm: AdmissionPayload = {
  admission_number: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  gender: "",
  date_of_birth: "",
  admission_date: today,
  academic_year_id: "",
  curriculum: "",
  grade_level: "",
  class_section_id: "",
  stream_id: "",
  subject_ids: [],
  guardian_name: "",
  guardian_relationship: "",
  guardian_phone: "",
};

function capacityLabel(capacity: number | null, count: number) {
  if (capacity == null) return `${count} learners`;
  return `${count}/${capacity} learners`;
}

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message || "Admission could not be completed");
  }
  return "Admission could not be completed. Check the details and retry.";
}

function hasMeaningfulDraft(
  form: AdmissionPayload,
  step: number,
  suggestedAdmissionNumber: string | undefined,
) {
  if (step > 0 || form.subject_ids.length > 0) return true;
  if (
    form.admission_number.trim()
    && form.admission_number.trim() !== suggestedAdmissionNumber?.trim()
  ) return true;
  if (form.admission_date !== today) return true;

  return [
    form.first_name,
    form.middle_name,
    form.last_name,
    form.gender,
    form.date_of_birth,
    form.academic_year_id,
    form.curriculum,
    form.grade_level,
    form.class_section_id,
    form.stream_id,
    form.guardian_name,
    form.guardian_relationship,
    form.guardian_phone,
  ].some((value) => value.trim().length > 0);
}

export function StudentAdmissionWizard({
  onCancel,
  onAdmitted,
}: {
  onCancel: () => void;
  onAdmitted: () => Promise<unknown> | unknown;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<AdmissionPayload>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<AdmissionResult | null>(null);
  const [preflight, setPreflight] = useState<AdmissionPreflight | null>(null);
  const [draftStatus, setDraftStatus] = useState<"loading" | "ready" | "saved" | "saving" | "queued" | "failed">("loading");
  const [closingDraft, setClosingDraft] = useState(false);
  const [discardingDraft, setDiscardingDraft] = useState(false);
  const [startingNextAdmission, setStartingNextAdmission] = useState(false);
  const [nextAdmissionError, setNextAdmissionError] = useState<string | null>(null);
  const draftHydrated = useRef(false);
  const draftSaveSequence = useRef(0);
  const pendingDraftSave = useRef<Promise<unknown> | null>(null);
  const draftSaveTimer = useRef<number | null>(null);
  const draftWritesBlocked = useRef(false);
  const draftSaveFailed = useRef(false);
  const stepContent = useRef<HTMLDivElement>(null);
  const focusNextStep = useRef(false);
  const feedbackId = useId();
  const draftFeedbackId = `${feedbackId}-draft`;
  const subjectSummaryId = `${feedbackId}-subjects`;
  const foundationQuery = useSchoolQuery<AdmissionFoundation>("/admissions/foundation", {
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 15_000,
  });
  const draftQuery = useSchoolQuery<AdmissionDraft | null>("/admissions/drafts/current", { retry: 1 });
  const admitStudent = useSchoolMutation<AdmissionResult, AdmissionPayload>("/admissions/manual", "POST", {
    invalidateSchoolQueries: false,
    queueNetworkFailures: false,
    requestTimeoutMs: 60_000,
  });
  const preflightAdmission = useSchoolMutation<AdmissionPreflight, AdmissionPayload>("/admissions/manual/preflight", "POST", {
    invalidateSchoolQueries: false,
    queueNetworkFailures: false,
    requestTimeoutMs: 30_000,
  });
  const saveDraft = useSchoolMutation<AdmissionDraft, { payload: Partial<AdmissionPayload> & { step: number } }>("/admissions/drafts/current", "PUT", {
    invalidateSchoolQueries: false,
  });
  const discardDraft = useSchoolMutation<{ discarded: boolean }, Record<string, never>>("/admissions/drafts/current", "DELETE", {
    invalidateSchoolQueries: false,
    queueNetworkFailures: false,
  });
  const updateSettings = useSchoolMutation<AdmissionSettings, Omit<AdmissionSettings, "suggested_admission_number">>("/admissions/settings", "PUT", {
    invalidateSchoolQueries: false,
    queueNetworkFailures: false,
  });
  const saveDraftAsync = saveDraft.mutateAsync;

  const foundation = foundationQuery.data;
  const years = foundation?.academic_years ?? [];
  const yearClasses = useMemo(
    () => (foundation?.classes ?? []).filter((item) => item.academic_year_id === form.academic_year_id),
    [foundation?.classes, form.academic_year_id],
  );
  const curricula = useMemo(
    () => [...new Set(yearClasses.map((item) => item.curriculum).filter(Boolean))],
    [yearClasses],
  );
  const classes = yearClasses.filter(
    (item) => item.curriculum === form.curriculum,
  );
  const streams = (foundation?.streams ?? []).filter(
    (item) => item.class_section_id === form.class_section_id,
  );
  const classSubjectAssignments = useMemo(
    () => (foundation?.class_subject_assignments ?? []).filter(
      (item) =>
        item.class_section_id === form.class_section_id &&
        (!item.stream_id || item.stream_id === form.stream_id),
    ),
    [foundation?.class_subject_assignments, form.class_section_id, form.stream_id],
  );
  const subjects = useMemo(() => {
    const assignmentsBySubject = new Map(
      classSubjectAssignments.map((assignment) => [assignment.subject_id, assignment]),
    );

    return (foundation?.subjects ?? [])
      .filter((subject) => assignmentsBySubject.has(subject.id))
      .map((subject) => {
        const assignment = assignmentsBySubject.get(subject.id);
        return {
          ...subject,
          // A class offering is the specific policy for this learner's class.
          // `false` is an intentional optional override, so it must not be ORed
          // with the broader subject catalogue default.
          is_compulsory: assignment?.is_compulsory ?? subject.is_compulsory,
          is_examinable: assignment?.is_examinable ?? subject.is_examinable,
        };
      });
  }, [classSubjectAssignments, foundation?.subjects]);
  const compulsorySubjectIds = useMemo(
    () => subjects.filter((subject) => subject.is_compulsory).map((subject) => subject.id),
    [subjects],
  );
  const selectedClass = (foundation?.classes ?? []).find((item) => item.id === form.class_section_id);
  const canonicalSubjectIds = useMemo(() => {
    const availableSubjectIds = new Set(subjects.map((subject) => subject.id));
    return [...new Set([
      ...form.subject_ids.filter((subjectId) => availableSubjectIds.has(subjectId)),
      ...compulsorySubjectIds,
    ])];
  }, [compulsorySubjectIds, form.subject_ids, subjects]);
  const canonicalForm = useMemo(
    () => ({
      ...form,
      grade_level: selectedClass?.name ?? form.grade_level,
      subject_ids: canonicalSubjectIds,
    }),
    [canonicalSubjectIds, form, selectedClass?.name],
  );
  const selectedStream = (foundation?.streams ?? []).find((item) => item.id === form.stream_id);
  const selectedYear = years.find((item) => item.id === form.academic_year_id);
  const selectedSubjects = subjects.filter((item) => canonicalSubjectIds.includes(item.id));
  const admissionSettings = foundation?.admission_settings;
  const actionPending = closingDraft || discardingDraft || discardDraft.isPending || admitStudent.isPending || preflightAdmission.isPending;
  const excessSubjects = Math.max(0, canonicalSubjectIds.length - (admissionSettings?.maximum_subjects ?? canonicalSubjectIds.length));
  const subjectLimitExceeded = excessSubjects > 0;
  const draftMessage = draftStatus === "loading" ? "Checking saved draft..."
    : draftStatus === "ready" ? "Your draft will save as you enter the learner's details."
      : draftStatus === "saving" ? "Saving draft..."
        : draftStatus === "queued" ? "Draft saved on this device and queued for secure school sync."
          : draftStatus === "failed" ? "Draft could not be saved. Your entered data remains on this screen. Retry by choosing Close and keep draft."
            : "Draft saved securely for your school account.";

  useEffect(() => () => {
    toast.dismiss(feedbackId);
    toast.dismiss(draftFeedbackId);
  }, [draftFeedbackId, feedbackId]);

  useEffect(() => {
    if (!focusNextStep.current) return;
    focusNextStep.current = false;
    stepContent.current?.focus({ preventScroll: true });
    stepContent.current?.scrollIntoView?.({ block: "start" });
  }, [step, result]);

  useEffect(() => {
    if (draftHydrated.current || foundationQuery.isLoading || draftQuery.isLoading) return;
    draftHydrated.current = true;
    const saved = draftQuery.data?.payload;
    if (saved && Object.keys(saved).length > 1) {
      const { step: savedStep, ...savedForm } = saved;
      setForm({
        ...emptyForm,
        ...savedForm,
        subject_ids: Array.isArray(savedForm.subject_ids) ? savedForm.subject_ids : [],
      });
      setStep(Math.max(0, Math.min(Number(savedStep ?? 0), steps.length - 1)));
      setDraftStatus("saved");
      return;
    }
    if (admissionSettings?.suggested_admission_number) {
      setForm((current) => ({
        ...current,
        admission_number: current.admission_number || admissionSettings.suggested_admission_number,
      }));
    }
    if (draftQuery.isError) {
      setDraftStatus("failed");
      toast.warning("The saved admission draft could not be loaded. Your entered details remain on this screen.", { id: draftFeedbackId, duration: Infinity });
    } else {
      setDraftStatus("ready");
    }
  }, [admissionSettings?.suggested_admission_number, draftFeedbackId, draftQuery.data, draftQuery.isError, draftQuery.isLoading, foundationQuery.isLoading]);

  useEffect(() => {
    if (
      !draftHydrated.current
      || result
      || draftWritesBlocked.current
      || closingDraft
      || discardingDraft
      || discardDraft.isPending
      || !form.admission_number
      || !hasMeaningfulDraft(form, step, admissionSettings?.suggested_admission_number)
    ) return;
    setDraftStatus("saving");
    const saveSequence = ++draftSaveSequence.current;
    const timer = window.setTimeout(() => {
      draftSaveTimer.current = null;
      if (draftWritesBlocked.current) return;
      // Keep writes in order so a slow earlier save cannot overwrite newer input.
      const saving = Promise.resolve(pendingDraftSave.current)
        .catch(() => undefined)
        .then(() => saveDraftAsync({ payload: { ...canonicalForm, step } }));
      pendingDraftSave.current = saving;
      saving
        .then((saved) => {
          if (saveSequence !== draftSaveSequence.current) return;
          draftSaveFailed.current = false;
          toast.dismiss(draftFeedbackId);
          setDraftStatus(
            saved && typeof saved === "object" && "_offline" in saved
              ? "queued"
              : "saved",
          );
        })
        .catch(() => {
          if (saveSequence !== draftSaveSequence.current) return;
          setDraftStatus("failed");
          if (!draftSaveFailed.current) {
            toast.error("Draft could not be saved. Keep this screen open and retry Close and keep draft.", { id: draftFeedbackId, duration: Infinity });
          }
          draftSaveFailed.current = true;
        });
    }, 700);
    draftSaveTimer.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (draftSaveTimer.current === timer) draftSaveTimer.current = null;
    };
  }, [admissionSettings?.suggested_admission_number, canonicalForm, closingDraft, discardDraft.isPending, discardingDraft, draftFeedbackId, form, result, saveDraftAsync, step]);

  function clearFormError() {
    setFormError(null);
    toast.dismiss(feedbackId);
  }

  function reportFormError(message: string) {
    setFormError(message);
    // Notify on every attempt, including when the validation message is unchanged.
    toast.error(message, { id: feedbackId, duration: Infinity });
  }

  function stopScheduledDraftSave() {
    draftWritesBlocked.current = true;
    draftSaveSequence.current += 1;
    if (draftSaveTimer.current !== null) {
      window.clearTimeout(draftSaveTimer.current);
      draftSaveTimer.current = null;
    }
  }

  async function closeAndKeepDraft() {
    if (draftWritesBlocked.current) return;
    if (!hasMeaningfulDraft(form, step, admissionSettings?.suggested_admission_number)) {
      onCancel();
      return;
    }
    setClosingDraft(true);
    setDraftStatus("saving");
    stopScheduledDraftSave();
    try {
      await pendingDraftSave.current?.catch(() => undefined);
      const saved = await saveDraftAsync({ payload: { ...canonicalForm, step } });
      const queued = saved && typeof saved === "object" && "_offline" in saved;
      toast.success(queued ? "Draft saved on this device and queued for secure school sync." : "Admission draft saved. You can resume it later.");
      onCancel();
    } catch (error) {
      draftWritesBlocked.current = false;
      setDraftStatus("failed");
      reportFormError(`The draft could not be saved, so this screen remains open. ${errorMessage(error)}`);
      setClosingDraft(false);
    }
  }

  async function discardAndClose() {
    if (draftWritesBlocked.current) return;
    stopScheduledDraftSave();
    setDiscardingDraft(true);
    try {
      // DELETE must run after every already-started save to prevent resurrection.
      await pendingDraftSave.current?.catch(() => undefined);
      await discardDraft.mutateAsync({});
      onCancel();
    } catch (error) {
      draftWritesBlocked.current = false;
      setDiscardingDraft(false);
      reportFormError(`The draft could not be discarded. ${errorMessage(error)}`);
    }
  }

  async function saveAdmissionSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const optionalNumber = (name: string) => {
      const value = String(data.get(name) ?? "").trim();
      return value ? Number(value) : null;
    };
    try {
      await updateSettings.mutateAsync({
        admission_number_mode: String(data.get("admission_number_mode")) as AdmissionSettings["admission_number_mode"],
        admission_number_prefix: String(data.get("admission_number_prefix") ?? ""),
        admission_number_separator: String(data.get("admission_number_separator")) as AdmissionSettings["admission_number_separator"],
        admission_number_padding: Number(data.get("admission_number_padding")),
        include_academic_year: data.get("include_academic_year") === "on",
        strict_capacity: data.get("strict_capacity") === "on",
        strict_age_rules: data.get("strict_age_rules") === "on",
        minimum_age: optionalNumber("minimum_age"),
        maximum_age: optionalNumber("maximum_age"),
        minimum_subjects: optionalNumber("minimum_subjects"),
        maximum_subjects: optionalNumber("maximum_subjects"),
      });
      const refreshed = await foundationQuery.refetch();
      const nextNumber = refreshed.data?.admission_settings.suggested_admission_number;
      if (nextNumber && !form.first_name) update("admission_number", nextNumber);
      toast.success("Admission policy saved for this school.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  function update<Key extends keyof AdmissionPayload>(key: Key, value: AdmissionPayload[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    clearFormError();
    setPreflight(null);
  }

  function validateStep(currentStep: number) {
    if (currentStep === 0) {
      const fields = [
        ["Admission number", form.admission_number],
        ["First name", form.first_name],
        ["Last name", form.last_name],
        ["Gender", form.gender],
        ["Admission date", form.admission_date],
      ];
      const missing = fields.filter(([, value]) => !String(value).trim()).map(([label]) => label);
      if (missing.length) return `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} required.`;
    }
    if (currentStep === 1) {
      if (!form.academic_year_id || !form.curriculum || !form.class_section_id) {
        return "Academic year, curriculum, and class/form/grade are required.";
      }
      if (streams.length > 0 && !form.stream_id) return "Select a stream for this class.";
    }
    if (currentStep === 2) {
      if (subjects.length === 0) return "This class has no configured subjects. Ask the Deputy Principal to assign subjects first.";
      const missingCompulsory = subjects.some(
        (subject) => subject.is_compulsory && !canonicalSubjectIds.includes(subject.id),
      );
      if (missingCompulsory) return "All compulsory subjects must remain selected.";
      if (canonicalSubjectIds.length === 0) return "Select at least one subject.";
      if (admissionSettings?.minimum_subjects != null && canonicalSubjectIds.length < admissionSettings.minimum_subjects) {
        return `Select at least ${admissionSettings.minimum_subjects} subjects for this learner.`;
      }
      if (admissionSettings?.maximum_subjects != null && canonicalSubjectIds.length > admissionSettings.maximum_subjects) {
        return `Select no more than ${admissionSettings.maximum_subjects} subjects for this learner.`;
      }
    }
    if (currentStep === 3) {
      if (!form.guardian_name.trim() || !form.guardian_relationship.trim() || !form.guardian_phone.trim()) {
        return "Guardian name, relationship, and Kenyan mobile number are required.";
      }
    }
    return null;
  }

  async function runPreflight() {
    const review = await preflightAdmission.mutateAsync(canonicalForm);
    setPreflight(review);
    const blocking = review.warnings.filter((warning) => warning.blocking);
    if (blocking.length) {
      reportFormError(blocking.map((warning) => warning.message).join(" "));
      return false;
    }
    return true;
  }

  async function next() {
    const issue = validateStep(step);
    if (issue) {
      reportFormError(issue);
      return;
    }
    if (step === 1) {
      setForm((current) => ({ ...current, subject_ids: compulsorySubjectIds }));
    }
    if (step === 3) {
      try {
        if (!(await runPreflight())) return;
      } catch (error) {
        reportFormError(errorMessage(error));
        return;
      }
    }
    clearFormError();
    focusNextStep.current = true;
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  async function submit() {
    const issue = validateStep(3);
    if (issue) {
      reportFormError(issue);
      return;
    }
    clearFormError();
    try {
      if (!(await runPreflight())) return;
      const admission = await admitStudent.mutateAsync({
        ...canonicalForm,
        admission_number: canonicalForm.admission_number.trim(),
        first_name: canonicalForm.first_name.trim(),
        middle_name: canonicalForm.middle_name.trim(),
        last_name: canonicalForm.last_name.trim(),
        guardian_name: canonicalForm.guardian_name.trim(),
        guardian_relationship: canonicalForm.guardian_relationship.trim(),
        guardian_phone: canonicalForm.guardian_phone.trim(),
      });
      setResult(admission);
      setNextAdmissionError(null);
      setDraftStatus("saved");
      toast.success(`${admission.student.first_name} was admitted successfully.`);
      void Promise.resolve()
        .then(() => onAdmitted())
        .catch(() => {
          toast.warning("The learner was admitted. The admissions list will refresh automatically when the connection recovers.");
        });
    } catch (error) {
      reportFormError(errorMessage(error));
    }
  }

  async function beginNextAdmission(preserveGuardian: boolean) {
    setStartingNextAdmission(true);
    setNextAdmissionError(null);
    try {
      const refreshed = await foundationQuery.refetch();
      if (refreshed.isError || !refreshed.data) {
        throw refreshed.error ?? new Error("Academic foundation is unavailable");
      }
      const guardian = preserveGuardian
        ? {
            guardian_name: form.guardian_name,
            guardian_relationship: form.guardian_relationship,
            guardian_phone: form.guardian_phone,
          }
        : {};
      draftSaveSequence.current += 1;
      setPreflight(null);
      clearFormError();
      setForm({
        ...emptyForm,
        admission_number: refreshed.data.admission_settings.suggested_admission_number ?? "",
        ...guardian,
      });
      focusNextStep.current = true;
      setStep(0);
      setDraftStatus("ready");
      setResult(null);
    } catch (error) {
      const message = `The learner was admitted, but a fresh admission could not be prepared. ${errorMessage(error)}`;
      setNextAdmissionError(message);
      toast.error(message);
    } finally {
      setStartingNextAdmission(false);
    }
  }

  if (result) {
    const studentName = [result.student.first_name, result.student.middle_name, result.student.last_name]
      .filter(Boolean)
      .join(" ");
    return (
      <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
            <UserRoundCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-lg font-black text-[#071D49]">Student admitted</h3>
            <p className="mt-1 text-sm font-semibold text-emerald-800">
              {studentName} is now active in {result.placement.class_name}
              {result.placement.stream_name ? `, ${result.placement.stream_name}` : ""}.
            </p>
          </div>
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-emerald-200 bg-white p-3">
            <dt className="text-xs font-bold uppercase text-[#64748B]">Admission number</dt>
            <dd className="mt-1 font-black text-[#071D49]">{result.student.admission_number}</dd>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-white p-3">
            <dt className="text-xs font-bold uppercase text-[#64748B]">Subjects</dt>
            <dd className="mt-1 font-black text-[#071D49]">{result.subjects.length} enrolled</dd>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-white p-3">
            <dt className="text-xs font-bold uppercase text-[#64748B]">Parent access</dt>
            <dd className="mt-1 font-black text-[#071D49]">
              {result.guardian.portal_access === "otp_ready" ? "OTP ready" : "Needs role setup"}
            </dd>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-white p-3">
            <dt className="text-xs font-bold uppercase text-[#64748B]">Fees</dt>
            <dd className="mt-1 font-black text-[#071D49]">
              {result.fees.status === "invoiced" ? result.fees.invoice_number : "Fee structure not set"}
            </dd>
          </div>
        </dl>
        {result.placement.capacity_warning ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
            Capacity warning: this placement is above the configured class or stream capacity. Admission was retained for review.
          </p>
        ) : null}
        {result.placement.age_warning ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
            Age review retained: the learner was admitted after staff confirmed the unusual age and grade combination.
          </p>
        ) : null}
        {result.downstream_sync?.status === "degraded" ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
            {result.downstream_sync.message ?? "The learner is admitted. Some dashboard notifications are still synchronizing."}
          </p>
        ) : null}
        {nextAdmissionError ? (
          <p role="alert" className="mt-3 break-words rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
            {nextAdmissionError}
          </p>
        ) : null}
        <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap [&_button]:min-h-11">
          <button
            type="button"
            onClick={() => void beginNextAdmission(false)}
            disabled={startingNextAdmission}
            className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-60"
          >
            {startingNextAdmission ? "Preparing fresh admission..." : "Admit another student"}
          </button>
          {result.guardian.existing_sibling_guardian ? (
            <button
              type="button"
              onClick={() => void beginNextAdmission(true)}
              disabled={startingNextAdmission}
              className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-black text-emerald-800 disabled:opacity-60"
            >
              Admit sibling
            </button>
          ) : null}
          <button type="button" onClick={onCancel} className="rounded-xl border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-black text-[#071D49]">
            Close admission
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6 rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-[#071D49]">New student admission</h3>
          <p className="mt-1 text-sm font-semibold text-[#64748B]">
            Complete each stage. The final action creates the learner, placement, subjects, guardian access, fees, and downstream records together.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void foundationQuery.refetch()}
          disabled={foundationQuery.isFetching}
          className="shrink-0 rounded-xl border border-cyan-300 bg-white px-3 py-2 text-xs font-black text-[#071D49] disabled:opacity-60"
        >
          {foundationQuery.isFetching ? "Refreshing setup..." : "Refresh classes, streams & subjects"}
        </button>
      </div>
      {admissionSettings ? (
        <details className="mb-4 rounded-xl border border-[#D8E0EC] bg-white p-3">
          <summary className="cursor-pointer text-sm font-black text-[#071D49]">Admission numbering and safeguards</summary>
          <form onSubmit={(event) => void saveAdmissionSettings(event)}>
          <fieldset disabled={closingDraft || discardingDraft} className="mt-4 grid min-w-0 gap-3 md:grid-cols-3 xl:grid-cols-4">
            <Field label="Admission number mode">
              <select name="admission_number_mode" defaultValue={admissionSettings.admission_number_mode}>
                <option value="manual">Manual</option>
                <option value="suggested">Suggested and editable</option>
                <option value="automatic">Automatic</option>
              </select>
            </Field>
            <Field label="Prefix"><input name="admission_number_prefix" defaultValue={admissionSettings.admission_number_prefix} maxLength={20} /></Field>
            <Field label="Separator">
              <select name="admission_number_separator" defaultValue={admissionSettings.admission_number_separator}>
                <option value="-">Hyphen (-)</option><option value="/">Slash (/)</option><option value=".">Dot (.)</option><option value="_">Underscore (_)</option>
              </select>
            </Field>
            <Field label="Number padding"><input name="admission_number_padding" type="number" min={3} max={12} defaultValue={admissionSettings.admission_number_padding} /></Field>
            <Field label="Minimum learner age"><input name="minimum_age" type="number" min={2} max={30} defaultValue={admissionSettings.minimum_age ?? ""} /></Field>
            <Field label="Maximum learner age"><input name="maximum_age" type="number" min={2} max={30} defaultValue={admissionSettings.maximum_age ?? ""} /></Field>
            <Field label="Minimum subjects"><input name="minimum_subjects" type="number" min={1} max={40} defaultValue={admissionSettings.minimum_subjects ?? ""} /></Field>
            <Field label="Maximum subjects"><input name="maximum_subjects" type="number" min={1} max={40} defaultValue={admissionSettings.maximum_subjects ?? ""} /></Field>
            <label className="flex items-center gap-2 text-sm font-bold text-[#071D49]"><input name="include_academic_year" type="checkbox" defaultChecked={admissionSettings.include_academic_year} /> Include academic year</label>
            <label className="flex items-center gap-2 text-sm font-bold text-[#071D49]"><input name="strict_capacity" type="checkbox" defaultChecked={admissionSettings.strict_capacity} /> Block full classes/streams</label>
            <label className="flex items-center gap-2 text-sm font-bold text-[#071D49]"><input name="strict_age_rules" type="checkbox" defaultChecked={admissionSettings.strict_age_rules} /> Enforce age range</label>
            <button type="submit" disabled={updateSettings.isPending} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-60">
              {updateSettings.isPending ? "Saving policy..." : "Save admission policy"}
            </button>
          </fieldset>
          </form>
        </details>
      ) : null}

      <ol className="mb-5 grid gap-2 sm:grid-cols-5">
        {steps.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? "step" : undefined}
            className={`rounded-xl border px-3 py-2 text-xs font-black ${
              index === step
                ? "border-cyan-400 bg-cyan-100 text-[#071D49]"
                : index < step
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-[#D8E0EC] bg-white text-[#64748B]"
            }`}
          >
            <span className="mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-white">
              {index < step ? <Check className="h-3 w-3" aria-hidden="true" /> : index + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>

      {foundationQuery.isLoading ? (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-[#D8E0EC] bg-white p-4 text-sm font-bold text-[#64748B]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading this school&apos;s academic foundation...
        </div>
      ) : foundationQuery.isError ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          Academic foundation could not be loaded. Retry before admitting a learner.
          <button type="button" onClick={() => void foundationQuery.refetch()} disabled={foundationQuery.isFetching} className="ml-3 rounded-lg border border-rose-300 bg-white px-3 py-1 disabled:opacity-60">
            {foundationQuery.isFetching ? "Retrying..." : "Retry"}
          </button>
        </div>
      ) : years.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
          No academic year is configured. Ask the Principal or Deputy Principal to complete Academic Foundation first.
        </div>
      ) : (
        <>
          <div ref={stepContent} role="group" aria-label={steps[step]} tabIndex={-1} className="scroll-mt-24 outline-none" onChange={() => { clearFormError(); setPreflight(null); }}>
          <fieldset disabled={closingDraft || discardingDraft} className="min-w-0">
          {step === 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Admission number" hint={admissionSettings?.admission_number_mode === "automatic" ? "Generated from the school sequence. Refresh if another admission uses it first." : "School suggestion can be edited before admission."}><input autoFocus readOnly={admissionSettings?.admission_number_mode === "automatic"} value={form.admission_number} onChange={(event) => update("admission_number", event.target.value)} /></Field>
              <Field label="First name"><input value={form.first_name} onChange={(event) => update("first_name", event.target.value)} /></Field>
              <Field label="Middle name (optional)"><input value={form.middle_name} onChange={(event) => update("middle_name", event.target.value)} /></Field>
              <Field label="Last name"><input value={form.last_name} onChange={(event) => update("last_name", event.target.value)} /></Field>
              <Field label="Gender">
                <select value={form.gender} onChange={(event) => update("gender", event.target.value)}>
                  <option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option><option value="undisclosed">Prefer not to state</option>
                </select>
              </Field>
              <Field
                label="Date of birth (optional)"
                hint="Leave blank if unknown. Use DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD when supplied."
              >
                <input inputMode="numeric" placeholder="DD/MM/YYYY" value={form.date_of_birth} onChange={(event) => update("date_of_birth", event.target.value)} />
              </Field>
              <Field label="Admission date"><input type="date" value={form.admission_date} onChange={(event) => update("admission_date", event.target.value)} /></Field>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Academic year">
                <select value={form.academic_year_id} onChange={(event) => setForm((current) => ({ ...current, academic_year_id: event.target.value, curriculum: "", grade_level: "", class_section_id: "", stream_id: "", subject_ids: [] }))}>
                  <option value="">Select academic year</option>{years.map((year) => <option key={year.id} value={year.id}>{year.name}{year.is_current ? " (current)" : ""}</option>)}
                </select>
              </Field>
              <Field label="Curriculum">
                <select disabled={!form.academic_year_id} value={form.curriculum} onChange={(event) => setForm((current) => ({ ...current, curriculum: event.target.value, grade_level: "", class_section_id: "", stream_id: "", subject_ids: [] }))}>
                  <option value="">Select curriculum</option>{curricula.map((curriculum) => <option key={curriculum} value={curriculum}>{curriculum}</option>)}
                </select>
              </Field>
              <Field label="Class / form / grade">
                <select disabled={!form.curriculum} value={form.class_section_id} onChange={(event) => {
                  const classSectionId = event.target.value;
                  const classSection = classes.find((item) => item.id === classSectionId);
                  setForm((current) => ({ ...current, grade_level: classSection?.name ?? "", class_section_id: classSectionId, stream_id: "", subject_ids: [] }));
                }}>
                  <option value="">Select class, form, or grade</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name} ({capacityLabel(item.capacity, item.student_count)}){!item.enrolment_open ? " - closed" : ""}</option>)}
                </select>
              </Field>
              <Field label="Stream" hint={streams.length === 0 && form.class_section_id ? "This class does not use streams." : undefined}>
                <select disabled={!form.class_section_id || streams.length === 0} value={form.stream_id} onChange={(event) => update("stream_id", event.target.value)}>
                  <option value="">{streams.length ? "Select stream" : "No stream required"}</option>{streams.map((item) => <option key={item.id} value={item.id}>{item.name} ({capacityLabel(item.capacity, item.student_count)})</option>)}
                </select>
              </Field>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <p className="mb-3 text-sm font-semibold text-[#64748B]">Compulsory subjects are selected automatically. Choose the learner&apos;s optional subjects.</p>
              {subjects.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">No subjects are assigned to this class and academic year.</div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {subjects.map((subject) => {
                    const compulsory = subject.is_compulsory;
                    const checked = compulsory || form.subject_ids.includes(subject.id);
                    return (
                      <label key={subject.id} className={`flex min-w-0 items-start gap-3 rounded-xl border p-3 ${checked ? "border-cyan-300 bg-cyan-50" : "border-[#D8E0EC] bg-white"}`}>
                        <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={checked} disabled={compulsory} aria-describedby={subjectSummaryId} onChange={(event) => update("subject_ids", event.target.checked ? [...form.subject_ids, subject.id] : form.subject_ids.filter((id) => id !== subject.id))} />
                        <span className="min-w-0 break-words"><span className="block font-black text-[#071D49]">{subject.name}</span><span className="text-xs font-semibold text-[#64748B]">{subject.code} - {compulsory ? "Compulsory" : "Optional"}</span></span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Primary guardian name"><input value={form.guardian_name} onChange={(event) => update("guardian_name", event.target.value)} /></Field>
              <Field label="Relationship"><input placeholder="Mother, father, guardian..." value={form.guardian_relationship} onChange={(event) => update("guardian_relationship", event.target.value)} /></Field>
              <Field label="Kenyan mobile number" hint="Used to reuse sibling guardian records and for parent OTP access."><input inputMode="tel" placeholder="0712345678" value={form.guardian_phone} onChange={(event) => update("guardian_phone", event.target.value)} /></Field>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid gap-4">
              {preflight?.warnings.length ? (
                <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <h4 className="font-black text-amber-900">Review warnings</h4>
                  <ul className="mt-2 grid gap-2 text-sm font-semibold text-amber-900">
                    {preflight.warnings.map((warning) => <li key={`${warning.code}-${warning.message}`}>{warning.blocking ? "Action required: " : "Confirm: "}{warning.message}</li>)}
                  </ul>
                </section>
              ) : null}
              {preflight?.guardian ? (
                <section className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
                  <h4 className="font-black text-[#071D49]">Existing guardian found</h4>
                  <p className="mt-1 text-sm font-semibold text-[#475569]">{preflight.guardian.display_name} ({preflight.guardian.masked_phone}) will be reused. No duplicate parent account will be created.</p>
                  {preflight.guardian.children.length ? <p className="mt-2 text-sm font-bold text-[#071D49]">Linked learners: {preflight.guardian.children.map((child) => `${child.full_name} (${child.admission_number})`).join(", ")}</p> : null}
                </section>
              ) : null}
              <div className="grid gap-4 lg:grid-cols-2">
                <Review title="Student" rows={[["Admission number", form.admission_number], ["Name", [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(" ")], ["Gender", form.gender], ["Date of birth", form.date_of_birth || "Not provided"], ["Admission date", form.admission_date], ["Age on admission", preflight ? (preflight.age_at_admission == null ? "Not available" : String(preflight.age_at_admission)) : "Checking"]]} />
                <Review title="Placement" rows={[["Academic year", selectedYear?.name ?? ""], ["Curriculum", form.curriculum], ["Class / form / grade", selectedClass?.name ?? ""], ["Stream", selectedStream?.name ?? "Not used"], ["Capacity", selectedStream ? capacityLabel(selectedStream.capacity, selectedStream.student_count) : selectedClass ? capacityLabel(selectedClass.capacity, selectedClass.student_count) : "Not set"]]} />
                <Review title="Subjects" rows={selectedSubjects.map((subject) => [subject.is_compulsory ? `${subject.code} (compulsory)` : subject.code, subject.name])} />
                <Review title="Guardian" rows={[["Name", form.guardian_name], ["Relationship", form.guardian_relationship], ["Phone", preflight?.guardian?.masked_phone ?? form.guardian_phone]]} />
              </div>
            </div>
          ) : null}
          </fieldset>
          </div>

          <div role="group" aria-label="Admission actions" aria-busy={actionPending} className="mt-5 grid min-w-0 gap-3">
            {step === 2 ? (
              <p id={subjectSummaryId} role="status" className={`rounded-xl border px-3 py-2 text-sm font-bold ${subjectLimitExceeded ? "border-amber-300 bg-amber-50 text-amber-900" : "border-cyan-200 bg-white text-[#071D49]"}`}>
                {canonicalSubjectIds.length} {canonicalSubjectIds.length === 1 ? "subject" : "subjects"} selected.
                {admissionSettings?.minimum_subjects != null ? ` Minimum: ${admissionSettings.minimum_subjects}.` : ""}
                {admissionSettings?.maximum_subjects != null ? ` Maximum: ${admissionSettings.maximum_subjects}.` : ""}
                {subjectLimitExceeded ? compulsorySubjectIds.length > (admissionSettings?.maximum_subjects ?? Infinity)
                  ? " The compulsory subjects exceed this limit. Ask the Principal or Deputy Principal to review the subject policy."
                  : ` Remove ${excessSubjects} optional ${excessSubjects === 1 ? "subject" : "subjects"} to continue.` : ""}
              </p>
            ) : null}
            {formError ? (
              <div id={feedbackId} role="alert" aria-atomic="true" className="break-words rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
                {formError}
              </div>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              {step < steps.length - 1 ? (
                <button type="button" onClick={() => void next()} disabled={actionPending} aria-describedby={formError ? feedbackId : step === 2 ? subjectSummaryId : undefined} className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl bg-[#071D49] px-4 py-2.5 text-sm font-black text-white disabled:opacity-60 sm:col-start-2">{preflightAdmission.isPending ? <><Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /> Checking...</> : <>Continue <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" /></>}</button>
              ) : (
                <button type="button" onClick={() => void submit()} disabled={actionPending || preflight?.warnings.some((warning) => warning.blocking)} aria-describedby={formError ? feedbackId : undefined} className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl bg-[#FF6B1A] px-5 py-2.5 text-sm font-black text-white disabled:opacity-60 sm:col-start-2">{admitStudent.isPending || preflightAdmission.isPending ? <><Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /> Verifying and admitting...</> : "Admit student"}</button>
              )}
              <div className="grid min-w-0 gap-2 sm:col-start-1 sm:row-start-1 sm:flex sm:flex-wrap [&_button]:min-h-11 [&_button]:min-w-0 [&_button]:py-2.5 [&_button]:disabled:opacity-60">
                {step > 0 ? <button type="button" disabled={actionPending} onClick={() => { clearFormError(); focusNextStep.current = true; setStep((current) => current - 1); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D8E0EC] bg-white px-4 text-sm font-black text-[#071D49]"><ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" /> Back</button> : null}
                <button type="button" onClick={() => void closeAndKeepDraft()} disabled={actionPending} className="rounded-xl border border-[#D8E0EC] bg-white px-4 text-sm font-black text-[#071D49]">{closingDraft ? "Saving draft..." : "Close and keep draft"}</button>
                <button type="button" onClick={() => void discardAndClose()} disabled={actionPending} className="rounded-xl border border-rose-200 bg-white px-4 text-sm font-black text-rose-700">{discardingDraft || discardDraft.isPending ? "Discarding draft..." : "Discard draft"}</button>
              </div>
            </div>
            <p role="status" className={`text-xs font-bold ${draftStatus === "failed" ? "text-rose-700" : "text-[#64748B]"}`}>{draftMessage}</p>
          </div>
        </>
      )}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-[#071D49] [&_input]:rounded-xl [&_input]:border [&_input]:border-[#D8E0EC] [&_input]:bg-white [&_input]:px-3 [&_input]:py-2.5 [&_select]:rounded-xl [&_select]:border [&_select]:border-[#D8E0EC] [&_select]:bg-white [&_select]:px-3 [&_select]:py-2.5 [&_select:disabled]:bg-[#F1F5F9] [&_select:disabled]:text-[#64748B]">
      {label}
      {children}
      {hint ? <span className="text-xs font-semibold leading-5 text-[#64748B]">{hint}</span> : null}
    </label>
  );
}

function Review({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section className="rounded-xl border border-[#D8E0EC] bg-white p-4">
      <h4 className="font-black text-[#071D49]">{title}</h4>
      <dl className="mt-3 grid gap-2">
        {rows.map(([label, value]) => <div key={`${label}-${value}`} className="flex items-start justify-between gap-4 text-sm"><dt className="font-semibold text-[#64748B]">{label}</dt><dd className="text-right font-bold text-[#071D49]">{value || "Not set"}</dd></div>)}
      </dl>
    </section>
  );
}
