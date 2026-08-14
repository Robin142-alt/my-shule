"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  Redo2,
  Save,
  Search,
  Settings2,
  Sparkles,
  Undo2,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/modal";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { openPrintDocument } from "@/lib/dashboard/export";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { getCurrentSchoolId } from "@/lib/school/school-operational-store";
import {
  GenerationSummaryPanel,
  TimetableHistoryPanel,
  TimetableReadinessPanel,
  UnscheduledLessonsPanel,
} from "./timetable-command-panels";
import { DeputyTimetableReliefWorkspace } from "./timetable-relief-workspace";
import { TimetableScheduleView } from "./timetable-schedule-view";
import { PeriodConfigurationPanel, SubjectRequirementsPanel, TeacherAvailabilityPanel, TimetableResourcesPanel } from "./timetable-setup-panels";
import {
  type AcademicTerm,
  type AcademicYear,
  type AvailabilityResponse,
  type CandidateSlot,
  type ClassSection,
  type ConfigurationPeriod,
  type ConfigurationResponse,
  type FindBestSlotResponse,
  type GenerationResponse,
  type HistoryResponse,
  type OfflineAware,
  type PlannerResponse,
  type ReadinessResponse,
  type RequirementsResponse,
  type ResourcesResponse,
  type SaveState,
  type SlotPayload,
  type Subject,
  type Teacher,
  type TeacherAssignment,
  type TimetableSlot,
  type TimetableVersion,
  type TimetableView,
  type UnscheduledLesson,
  type UnscheduledResponse,
  type ValidationResponse,
  type ValidSlotsResponse,
  type ViewResponse,
  configurationFrom,
  currentSchoolDay,
  dayLabel,
  isOfflineQueued,
  rowsFrom,
  teacherId,
  teacherLabel,
  timeLabel,
} from "./timetable-types";

type WorkspaceTab = "command" | "setup" | "draft" | "published" | "relief" | "history";
type SetupTab = "periods" | "requirements" | "availability" | "resources";
type PlacementTarget = { kind: "slot"; slot: TimetableSlot } | { kind: "unscheduled"; item: UnscheduledLesson };
type CopyReviewIssue = { source_slot_id?: string; code: string; message: string };
type EditOperation =
  | { kind: "move"; slotId: string; label: string; before: CandidateSlot; after: CandidateSlot; rowVersion?: number }
  | { kind: "lock"; slotId: string; label: string; before: boolean; after: boolean; rowVersion?: number };

const EMPTY_SLOT: SlotPayload = {
  academic_year: "",
  term_name: "",
  class_section_id: "",
  subject_id: "",
  teacher_id: "",
  resource_id: "",
  room_id: "",
  day_of_week: 1,
  period_id: "",
  starts_at: "08:00",
  ends_at: "08:40",
  duration_periods: 1,
  parallel_key: "",
};

const controlClass = "mt-1 h-11 w-full rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-semibold text-[#071D49] outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-200/30";

function saveStateLabel(state: SaveState) {
  if (state === "saving") return "Saving draft changes...";
  if (state === "saved") return "All server changes saved";
  if (state === "queued") return "Changes queued on this device - not confirmed by the server";
  if (state === "failed") return "A change failed - review the error and retry";
  return "Draft changes save after each confirmed action";
}

function periodFor(configuration: ReturnType<typeof configurationFrom>, day: number, periodId?: string | null) {
  return configuration?.days.find((candidate) => candidate.day_of_week === day)?.periods.find((period) => period.id === periodId) ?? null;
}

export function DeputyTimetableManagementWorkspace() {
  const scopedTenantId = useOptionalSchoolTenantId();
  const activeTenantId = scopedTenantId || getCurrentSchoolId() || undefined;
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("command");
  const [setupTab, setSetupTab] = useState<SetupTab>("periods");
  const [selectedYearName, setSelectedYearName] = useState("");
  const [selectedTermName, setSelectedTermName] = useState("");
  const [view, setView] = useState<TimetableView>("class");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [selectedDay, setSelectedDay] = useState(currentSchoolDay);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotDraft, setSlotDraft] = useState<SlotPayload>(EMPTY_SLOT);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publicationNotes, setPublicationNotes] = useState("");
  const [acknowledgeWarnings, setAcknowledgeWarnings] = useState(false);
  const [copySource, setCopySource] = useState<TimetableVersion | null>(null);
  const [copyReviewIssues, setCopyReviewIssues] = useState<CopyReviewIssue[]>([]);
  const [placementTarget, setPlacementTarget] = useState<PlacementTarget | null>(null);
  const [candidateSlots, setCandidateSlots] = useState<CandidateSlot[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateSlot | null>(null);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateError, setCandidateError] = useState("");
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [generationSummary, setGenerationSummary] = useState<GenerationResponse | null>(null);
  const [scopeType, setScopeType] = useState<"school" | "class" | "teacher" | "requirement">("school");
  const [scopeId, setScopeId] = useState("");
  const [operations, setOperations] = useState<EditOperation[]>([]);
  const [operationIndex, setOperationIndex] = useState(0);
  const [slotActionPending, setSlotActionPending] = useState(false);

  const yearsQuery = useSchoolQuery<AcademicYear[] | { items?: AcademicYear[] }>("/api/academics/academic-years");
  const termsQuery = useSchoolQuery<AcademicTerm[] | { items?: AcademicTerm[] }>("/api/academics/academic-terms");
  const classesQuery = useSchoolQuery<ClassSection[] | { items?: ClassSection[] }>("/api/academics/class-sections");
  const subjectsQuery = useSchoolQuery<Subject[] | { items?: Subject[] }>("/api/academics/subjects");
  const teachersQuery = useSchoolQuery<Teacher[] | { items?: Teacher[] }>("/api/academics/teachers");
  const assignmentsQuery = useSchoolQuery<TeacherAssignment[] | { items?: TeacherAssignment[] }>("/api/academics/teacher-assignments?limit=300");

  const years = rowsFrom(yearsQuery.data);
  const allTerms = rowsFrom(termsQuery.data);
  const allClasses = rowsFrom(classesQuery.data);
  const subjects = rowsFrom(subjectsQuery.data);
  const teachers = rowsFrom(teachersQuery.data);
  const assignments = rowsFrom(assignmentsQuery.data);
  const selectedYear = years.find((year) => year.name === selectedYearName) ?? years[0] ?? null;
  const terms = selectedYear ? allTerms.filter((term) => term.academic_year_id === selectedYear.id) : [];
  const selectedTerm = terms.find((term) => term.name === selectedTermName) ?? terms[0] ?? null;
  const classes = selectedYear ? allClasses.filter((section) => !section.academic_year_id || section.academic_year_id === selectedYear.id) : [];
  const academicYear = selectedYear?.name ?? "";
  const termName = selectedTerm?.name ?? "";
  const selectorQuery = academicYear && termName ? `academic_year=${encodeURIComponent(academicYear)}&term_name=${encodeURIComponent(termName)}` : "";
  const effectiveClassId = selectedClassId || classes[0]?.id || "";
  const effectiveTeacherId = selectedTeacherId || (teachers[0] ? teacherId(teachers[0]) : "");

  const readinessQuery = useSchoolQuery<ReadinessResponse>(selectorQuery ? `/api/timetable/readiness?${selectorQuery}` : null);
  const plannerQuery = useSchoolQuery<PlannerResponse>(selectorQuery ? `/api/timetable/planner?${selectorQuery}` : null);
  const configurationQuery = useSchoolQuery<ConfigurationResponse>(selectorQuery ? `/api/timetable/configuration?${selectorQuery}` : null);
  const requirementsQuery = useSchoolQuery<RequirementsResponse>(selectorQuery ? `/api/timetable/requirements?${selectorQuery}` : null);
  const availabilityQuery = useSchoolQuery<AvailabilityResponse>(selectorQuery ? `/api/timetable/availability?${selectorQuery}` : null);
  const resourcesQuery = useSchoolQuery<ResourcesResponse>("/api/timetable/resources");
  const unscheduledQuery = useSchoolQuery<UnscheduledResponse>(selectorQuery ? `/api/timetable/unscheduled?${selectorQuery}` : null);
  const historyQuery = useSchoolQuery<HistoryResponse>(selectorQuery ? `/api/timetable/versions/history?${selectorQuery}` : null);
  const viewParams = (() => {
    if (!selectorQuery) return null;
    const params = new URLSearchParams(selectorQuery);
    params.set("view", view);
    if (view === "class" && effectiveClassId) params.set("class_section_id", effectiveClassId);
    if (view === "teacher" && effectiveTeacherId) params.set("teacher_id", effectiveTeacherId);
    if (view === "resource" && selectedResourceId) params.set("resource_id", selectedResourceId);
    if (view === "master") params.set("day_of_week", String(selectedDay));
    return params;
  })();
  const draftViewPath = viewParams ? (() => { const params = new URLSearchParams(viewParams); params.set("include_draft", "true"); return `/api/timetable/views?${params.toString()}`; })() : null;
  const publishedViewPath = viewParams ? `/api/timetable/views?${viewParams.toString()}` : null;
  const draftViewQuery = useSchoolQuery<ViewResponse>(draftViewPath);
  const publishedViewQuery = useSchoolQuery<ViewResponse>(publishedViewPath);

  const allResources = resourcesQuery.data?.items ?? [];
  const resources = allResources.filter((resource) => resource.status === "active");
  const configuration = configurationFrom(configurationQuery.data);
  const plannerSlots = plannerQuery.data?.slots ?? [];
  const draftRows = draftViewQuery.data?.items ?? plannerSlots;
  const publishedRows = publishedViewQuery.data?.items ?? [];
  const historyItems = historyQuery.data?.items ?? [];
  const version = plannerQuery.data?.version ?? draftViewQuery.data?.version ?? null;
  const isEditableDraft = Boolean(version && version.status !== "published" && !version.immutable);
  const primaryRows = activeTab === "published" ? publishedRows : draftRows;

  const createMutation = useSchoolMutation<OfflineAware<TimetableSlot>, SlotPayload>("/api/timetable/slots", "POST");
  const updateMutation = useSchoolMutation<OfflineAware<TimetableSlot>, SlotPayload>(() => `/api/timetable/slots/${encodeURIComponent(editingSlotId ?? "missing")}`, "PATCH");
  const generateMutation = useSchoolMutation<OfflineAware<GenerationResponse>, Record<string, unknown>>("/api/timetable/generate", "POST");
  const regenerateMutation = useSchoolMutation<OfflineAware<GenerationResponse>, Record<string, unknown>>("/api/timetable/regenerate", "POST");
  const autoFixMutation = useSchoolMutation<OfflineAware<{ changed_lessons: number; moves: Array<Record<string, unknown>>; unresolved_conflicts: number; version: TimetableVersion }>, Record<string, unknown>>("/api/timetable/versions/auto-fix", "POST");
  const copyMutation = useSchoolMutation<OfflineAware<{ version: TimetableVersion; slots_copied: number; unscheduled: unknown[]; review_issues: CopyReviewIssue[] }>, Record<string, unknown>>("/api/timetable/versions/copy", "POST");
  const publishMutation = useSchoolMutation<OfflineAware<{ version?: TimetableVersion } & TimetableVersion>, Record<string, unknown>>("/api/timetable/versions/publish", "POST");
  const reviseMutation = useSchoolMutation<OfflineAware<TimetableVersion & { reused_existing_draft?: boolean }>, Record<string, unknown>>("/api/timetable/versions/revise", "POST");

  const refreshTimetable = async () => {
    await Promise.all([
      readinessQuery.refetch(),
      plannerQuery.refetch(),
      draftViewQuery.refetch(),
      publishedViewQuery.refetch(),
      unscheduledQuery.refetch(),
      historyQuery.refetch(),
    ]);
  };

  const requestServer = async <T,>(path: string, method: "POST" | "PATCH" | "DELETE" | "PUT", body: Record<string, unknown>) => requestDashboardApi<T>(path, {
    method,
    ...(activeTenantId ? { tenantId: activeTenantId } : {}),
    body,
  });
  const postServer = async <T,>(path: string, body: Record<string, unknown>) => requestServer<T>(path, "POST", body);

  const finishMutation = async (result: unknown, successMessage: string) => {
    if (isOfflineQueued(result)) {
      setSaveState("queued");
      toast.warning("This action is queued on the device and is not yet confirmed by the timetable server.");
      return false;
    }
    setSaveState("saved");
    toast.success(successMessage);
    await refreshTimetable();
    return true;
  };

  const checkConflicts = async (quiet = false) => {
    if (!selectorQuery) return null;
    setValidationLoading(true);
    try {
      const result = await postServer<ValidationResponse>("/api/timetable/validate", {
        academic_year: academicYear,
        term_name: termName,
        version_id: version?.id,
        expected_version_row_version: version?.row_version,
      });
      setValidation(result);
      if (!quiet) toast[result.valid ? "success" : "error"](result.valid ? "No hard timetable conflicts were found." : `${result.hard_conflicts.length} hard conflict${result.hard_conflicts.length === 1 ? "" : "s"} must be resolved.`);
      return result;
    } catch (error) {
      if (!quiet) toast.error(error instanceof Error ? error.message : "Timetable validation could not be completed.");
      throw error;
    } finally {
      setValidationLoading(false);
    }
  };

  const generate = async () => {
    setSaveState("saving");
    try {
      const result = await generateMutation.mutateAsync({ academic_year: academicYear, term_name: termName, expected_version_row_version: version?.row_version, scope: "whole_school", preserve_locked: true, allow_partial: true });
      if (await finishMutation(result, "A maximum-valid timetable draft was generated.")) {
        setGenerationSummary(result);
        setActiveTab("draft");
        setOperations([]);
        setOperationIndex(0);
      }
    } catch (error) {
      setSaveState("failed");
      toast.error(error instanceof Error ? error.message : "Timetable generation failed without changing the current draft.");
    }
  };

  const regenerate = async () => {
    if (!window.confirm("Regenerate the selected scope while preserving locked lessons? Unlocked placements in that scope may change.")) return;
    setSaveState("saving");
    try {
      const scope = scopeType === "school" ? "whole_school" : scopeType;
      const result = await regenerateMutation.mutateAsync({ academic_year: academicYear, term_name: termName, expected_version_row_version: version?.row_version, scope, scope_id: scopeType === "school" ? undefined : scopeId, preserve_locked: true, allow_partial: true, confirm_scope: true });
      if (await finishMutation(result, "The selected scope was regenerated; locked lessons were preserved.")) setGenerationSummary(result);
    } catch (error) {
      setSaveState("failed");
      toast.error(error instanceof Error ? error.message : "Scoped regeneration failed without replacing the confirmed draft.");
    }
  };

  const autoFix = async () => {
    if (!window.confirm("Run server auto-fix on the draft? It will make the smallest valid changes it can and will not publish.")) return;
    setSaveState("saving");
    try {
      const result = await autoFixMutation.mutateAsync({ academic_year: academicYear, term_name: termName, expected_version_row_version: version?.row_version, preserve_locked: true });
      if (await finishMutation(result, "Auto-fix completed. Review all draft changes before publishing.")) {
        toast.info(`${result.changed_lessons} draft placement${result.changed_lessons === 1 ? "" : "s"} changed; ${result.unresolved_conflicts} conflict${result.unresolved_conflicts === 1 ? "" : "s"} remain.`);
        await checkConflicts(true);
      }
    } catch (error) {
      setSaveState("failed");
      toast.error(error instanceof Error ? error.message : "Auto-fix could not complete.");
    }
  };

  const copyPrevious = async () => {
    if (!copySource) return;
    setSaveState("saving");
    try {
      const result = await copyMutation.mutateAsync({ source_version_id: copySource.id, academic_year: academicYear, term_name: termName, expected_version_row_version: copySource.row_version, preserve_locked: true });
      if (await finishMutation(result, `${result.slots_copied} timetable slots were copied into a new reviewable draft.`)) {
        setCopyReviewIssues(result.review_issues ?? []);
        if ((result.review_issues?.length ?? 0) > 0) {
          toast.warning(`${result.review_issues.length} source lesson${result.review_issues.length === 1 ? " was" : "s were"} not copied because the target term changed. Review the details in the command centre.`);
        }
        setCopySource(null);
        setActiveTab("draft");
      }
    } catch (error) {
      setSaveState("failed");
      toast.error(error instanceof Error ? error.message : "The previous timetable could not be copied.");
    }
  };

  const createRevision = async (source?: TimetableVersion) => {
    setSaveState("saving");
    try {
      const result = await reviseMutation.mutateAsync({ academic_year: academicYear, term_name: termName, expected_version_row_version: source?.row_version, notes: `Revision created from the active published timetable on ${new Date().toLocaleDateString()}` });
      const message = result.reused_existing_draft
        ? "The existing draft revision was reopened; the published timetable remains unchanged."
        : "A tracked draft revision was created; the published timetable remains unchanged.";
      if (await finishMutation(result, message)) setActiveTab("draft");
    } catch (error) {
      setSaveState("failed");
      toast.error(error instanceof Error ? error.message : "A draft revision could not be created.");
    }
  };

  const publish = async () => {
    setSaveState("saving");
    try {
      const result = await checkConflicts(true);
      if (!result?.valid || result.hard_conflicts.length > 0) {
        setSaveState("failed");
        toast.error("Publishing is blocked by server-validated hard conflicts.");
        return;
      }
      const hasNonCriticalIssues = result.warnings.length > 0 || result.summary.unscheduled > 0;
      if (hasNonCriticalIssues && !acknowledgeWarnings) {
        setSaveState("idle");
        toast.warning("Acknowledge the non-critical warnings and unscheduled lessons before publishing.");
        return;
      }
      const published = await publishMutation.mutateAsync({ academic_year: academicYear, term_name: termName, expected_version_row_version: version?.row_version, acknowledge_warnings: hasNonCriticalIssues, notes: publicationNotes.trim() || undefined });
      if (await finishMutation(published, `${academicYear} ${termName} timetable was published as an immutable version.`)) {
        setPublishModalOpen(false);
        setPublicationNotes("");
        setAcknowledgeWarnings(false);
        setActiveTab("published");
      }
    } catch (error) {
      setSaveState("failed");
      toast.error(error instanceof Error ? error.message : "Timetable publishing did not complete.");
    }
  };

  const recordOperation = (operation: EditOperation) => {
    setOperations((current) => [...current.slice(0, operationIndex), operation]);
    setOperationIndex((current) => current + 1);
  };

  const moveTo = async (slot: TimetableSlot, destination: CandidateSlot, shouldRecord = true) => {
    if (slot.locked) return;
    setSaveState("saving");
    try {
      setSlotActionPending(true);
      const result = await postServer<TimetableSlot>(`/api/timetable/slots/${encodeURIComponent(slot.id)}/move`, { day_of_week: destination.day_of_week, period_id: destination.period_id, expected_row_version: slot.row_version });
      if (await finishMutation(result, `${slot.subject_name} moved to ${dayLabel(destination.day_of_week)}.`) && shouldRecord) {
        recordOperation({ kind: "move", slotId: slot.id, label: `${slot.subject_name} - ${slot.class_name}`, before: { day_of_week: slot.day_of_week, period_id: slot.period_id ?? "", state: "VALID", reasons: [] }, after: destination, rowVersion: result.row_version });
      }
      return result;
    } catch (error) {
      setSaveState("failed");
      toast.error(error instanceof Error ? error.message : "The lesson could not be moved. No clash was saved.");
      return null;
    } finally {
      setSlotActionPending(false);
    }
  };

  const toggleLock = async (slot: TimetableSlot, shouldRecord = true) => {
    setSaveState("saving");
    try {
      setSlotActionPending(true);
      const result = await postServer<TimetableSlot>(`/api/timetable/slots/${encodeURIComponent(slot.id)}/lock`, { locked: !slot.locked, expected_row_version: slot.row_version });
      if (await finishMutation(result, `${slot.subject_name} ${slot.locked ? "unlocked" : "locked"}.`) && shouldRecord) recordOperation({ kind: "lock", slotId: slot.id, label: `${slot.subject_name} - ${slot.class_name}`, before: Boolean(slot.locked), after: !slot.locked, rowVersion: result.row_version });
      return result;
    } catch (error) {
      setSaveState("failed");
      toast.error(error instanceof Error ? error.message : "The lesson lock could not be changed.");
      return null;
    } finally {
      setSlotActionPending(false);
    }
  };

  const removeSlot = async (slot: TimetableSlot) => {
    if (slot.locked || !window.confirm(`Remove ${slot.subject_name} for ${slot.class_name} from this draft? The requirement will remain visible if still required.`)) return;
    setSaveState("saving");
    try {
      setSlotActionPending(true);
      const result = await requestServer<TimetableSlot>(`/api/timetable/slots/${encodeURIComponent(slot.id)}`, "DELETE", { expected_row_version: slot.row_version });
      await finishMutation(result, "The draft lesson was removed; generation requirements were not deleted.");
    } catch (error) {
      setSaveState("failed");
      toast.error(error instanceof Error ? error.message : "The draft lesson could not be removed.");
    } finally {
      setSlotActionPending(false);
    }
  };

  const performHistoryOperation = async (direction: "undo" | "redo") => {
    const index = direction === "undo" ? operationIndex - 1 : operationIndex;
    const operation = operations[index];
    if (!operation) return;
    const currentSlot = plannerSlots.find((slot) => slot.id === operation.slotId) ?? draftRows.find((slot) => slot.id === operation.slotId);
    if (!currentSlot) {
      toast.error("This lesson changed elsewhere. Refresh before trying Undo or Redo again.");
      return;
    }
    setSaveState("saving");
    try {
      const target = direction === "undo" ? operation.before : operation.after;
      setSlotActionPending(true);
      const result = operation.kind === "move"
        ? await postServer<TimetableSlot>(`/api/timetable/slots/${encodeURIComponent(operation.slotId)}/move`, { day_of_week: (target as CandidateSlot).day_of_week, period_id: (target as CandidateSlot).period_id, expected_row_version: currentSlot.row_version })
        : await postServer<TimetableSlot>(`/api/timetable/slots/${encodeURIComponent(operation.slotId)}/lock`, { locked: target as boolean, expected_row_version: currentSlot.row_version });
      if (await finishMutation(result, `${direction === "undo" ? "Undid" : "Redid"} ${operation.label}.`)) setOperationIndex(index + (direction === "redo" ? 1 : 0));
    } catch (error) {
      setSaveState("failed");
      toast.error(error instanceof Error ? error.message : `${direction === "undo" ? "Undo" : "Redo"} failed server validation.`);
    } finally {
      setSlotActionPending(false);
    }
  };

  const openPlacement = async (target: PlacementTarget, findBest = false) => {
    setPlacementTarget(target);
    setCandidateSlots([]);
    setSelectedCandidate(null);
    setCandidateError("");
    setCandidateLoading(true);
    try {
      const payload: Record<string, unknown> = target.kind === "slot"
        ? { academic_year: academicYear, term_name: termName, version_id: target.slot.version_id, slot_id: target.slot.id }
        : { academic_year: academicYear, term_name: termName, version_id: version?.id, requirement_id: target.item.requirement_id };
      if (findBest) {
        const response = await postServer<FindBestSlotResponse>("/api/timetable/valid-slots/find-best", payload);
        const rows = [response.best, ...(response.alternatives ?? response.items)].filter(Boolean) as CandidateSlot[];
        setCandidateSlots(rows);
        setSelectedCandidate(response.best ?? rows[0] ?? null);
      } else {
        const response = await postServer<ValidSlotsResponse>("/api/timetable/valid-slots", payload);
        setCandidateSlots(response.items);
        setSelectedCandidate(response.best ?? response.items[0] ?? null);
      }
    } catch (error) {
      setCandidateError(error instanceof Error ? error.message : "Valid periods could not be calculated.");
    } finally {
      setCandidateLoading(false);
    }
  };

  const confirmPlacement = async () => {
    if (!placementTarget || !selectedCandidate) return;
    if (placementTarget.kind === "slot") {
      const result = await moveTo(placementTarget.slot, selectedCandidate);
      if (result && !isOfflineQueued(result)) setPlacementTarget(null);
      return;
    }
    setSaveState("saving");
    try {
      setSlotActionPending(true);
      const result = await postServer<TimetableSlot>(`/api/timetable/unscheduled/${encodeURIComponent(placementTarget.item.id)}/place`, { day_of_week: selectedCandidate.day_of_week, period_id: selectedCandidate.period_id, expected_version_row_version: version?.row_version });
      if (await finishMutation(result, "The unscheduled requirement was placed in a server-validated period.")) setPlacementTarget(null);
    } catch (error) {
      setSaveState("failed");
      toast.error(error instanceof Error ? error.message : "The unresolved lesson could not be placed.");
    } finally {
      setSlotActionPending(false);
    }
  };

  const selectedClassAssignments = assignments.filter((assignment) => assignment.academic_term_id === selectedTerm?.id && assignment.class_section_id === slotDraft.class_section_id);
  const allowedSubjectIds = new Set(selectedClassAssignments.map((assignment) => assignment.subject_id));
  const subjectOptions = subjects.filter((subject) => allowedSubjectIds.has(subject.id));
  const allowedTeacherIds = new Set(selectedClassAssignments.filter((assignment) => assignment.subject_id === slotDraft.subject_id).map((assignment) => assignment.teacher_user_id));
  const teacherOptions = teachers.filter((teacher) => allowedTeacherIds.has(teacherId(teacher)));
  const configuredDays = configuration?.days.filter((day) => day.is_teaching_day) ?? [];
  const configuredPeriods = configuredDays.find((day) => day.day_of_week === slotDraft.day_of_week)?.periods.filter((period) => period.is_teaching) ?? [];

  const applyPeriod = (period: ConfigurationPeriod | undefined, day = slotDraft.day_of_week) => setSlotDraft((current) => ({ ...current, day_of_week: day, period_id: period?.id ?? "", starts_at: period?.starts_at.slice(0, 5) ?? current.starts_at, ends_at: period?.ends_at.slice(0, 5) ?? current.ends_at }));
  const openCreateSlot = () => {
    const day = configuredDays[0];
    const period = day?.periods.find((candidate) => candidate.is_teaching);
    setEditingSlotId(null);
    setSlotDraft({ ...EMPTY_SLOT, academic_year: academicYear, term_name: termName, day_of_week: day?.day_of_week ?? 1, period_id: period?.id ?? "", starts_at: period?.starts_at.slice(0, 5) ?? "08:00", ends_at: period?.ends_at.slice(0, 5) ?? "08:40" });
    setSlotModalOpen(true);
  };
  const openEditSlot = (slot: TimetableSlot) => {
    setEditingSlotId(slot.id);
    setSlotDraft({ academic_year: slot.academic_year, term_name: slot.term_name, class_section_id: slot.class_section_id, subject_id: slot.subject_id, teacher_id: slot.teacher_id, resource_id: slot.resource_id ?? "", room_id: slot.room_id ?? "", day_of_week: slot.day_of_week, period_id: slot.period_id ?? "", starts_at: timeLabel(slot.starts_at), ends_at: timeLabel(slot.ends_at), duration_periods: slot.duration_periods ?? 1, parallel_key: slot.parallel_key ?? "", expected_row_version: slot.row_version });
    setSlotModalOpen(true);
  };
  const submitSlot = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!slotDraft.period_id || !slotDraft.teacher_id) {
      toast.error("Choose a configured teaching period and an allocated teacher.");
      return;
    }
    setSaveState("saving");
    try {
      const payload: SlotPayload = {
        ...slotDraft,
        resource_id: slotDraft.resource_id || undefined,
        room_id: slotDraft.room_id?.trim() || undefined,
        parallel_key: slotDraft.parallel_key?.trim() || undefined,
      };
      const result = editingSlotId ? await updateMutation.mutateAsync(payload) : await createMutation.mutateAsync(payload);
      if (await finishMutation(result, editingSlotId ? "Draft lesson changes passed server validation and were saved." : "A manually built lesson was added to the draft.")) {
        setSlotModalOpen(false);
        setEditingSlotId(null);
      }
    } catch (error) {
      setSaveState("failed");
      toast.error(error instanceof Error ? error.message : "The lesson could not be saved. No invalid placement was accepted.");
    }
  };

  const downloadCsv = async () => {
    if (!selectorQuery) return;
    try {
      const params = new URLSearchParams(selectorQuery);
      params.set("view", view);
      if (view === "class" && effectiveClassId) params.set("class_section_id", effectiveClassId);
      if (view === "teacher" && effectiveTeacherId) params.set("teacher_id", effectiveTeacherId);
      if (view === "resource" && selectedResourceId) params.set("resource_id", selectedResourceId);
      if (view === "master") params.set("day_of_week", String(selectedDay));
      const response = await fetch(`/api/timetable/export/csv?${params.toString()}`, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error(`CSV export failed (${response.status}).`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${academicYear}-${termName}-${view}-timetable.csv`.replaceAll(" ", "-").toLowerCase();
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("The server-generated timetable CSV was downloaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Timetable CSV could not be downloaded.");
    }
  };
  const printSchedule = () => {
    if (primaryRows.length === 0) {
      toast.error("There is no loaded timetable data to preview or print.");
      return;
    }
    openPrintDocument({
      eyebrow: "MyShule timetable",
      title: `${academicYear} ${termName} - ${view} view`,
      subtitle: activeTab === "published" ? "Active published timetable" : "Draft timetable review",
      rows: primaryRows.map((slot) => ({ label: `${dayLabel(slot.day_of_week)} ${timeLabel(slot.starts_at)}-${timeLabel(slot.ends_at)}`, value: `${slot.class_name} - ${slot.subject_name} - ${slot.teacher_name}${slot.resource_name || slot.room_id ? ` - ${slot.resource_name || slot.room_id}` : ""}` })),
      footer: "Previewed from tenant-scoped timetable data. Use Print or Download PDF in this preview.",
    });
  };

  const choosePreviousVersion = () => {
    const candidate = historyItems.find((item) => item.status === "published" && item.id !== version?.id);
    if (candidate) setCopySource(candidate);
    else {
      setActiveTab("history");
      toast.info("Choose a published source from version history. No source version will be changed.");
    }
  };

  const readinessBlocksGeneration = readinessQuery.data?.status === "BLOCKER" || !readinessQuery.data;
  const pendingAction = generateMutation.isPending || regenerateMutation.isPending || autoFixMutation.isPending || publishMutation.isPending || copyMutation.isPending || reviseMutation.isPending;
  const publicationImpact = validation?.impact;
  const scopeOptions = scopeType === "class" ? classes.map((row) => ({ id: row.id, label: row.name })) : scopeType === "teacher" ? teachers.map((row) => ({ id: teacherId(row), label: teacherLabel(row) })) : scopeType === "requirement" ? (requirementsQuery.data?.items ?? []).map((row) => ({ id: row.id ?? "", label: `${subjects.find((subject) => subject.id === row.subject_id)?.name ?? "Subject"} - ${classes.find((section) => section.id === row.class_section_id)?.name ?? "Class"}` })).filter((row) => row.id) : [];

  const renderViewControls = (published = false) => (
    <div className="space-y-3 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-3">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Timetable perspective">
        {(["class", "teacher", "resource", "master"] as TimetableView[]).map((candidate) => <button key={candidate} type="button" onClick={() => setView(candidate)} className={`min-h-10 rounded-lg px-3 text-xs font-black uppercase ${view === candidate ? "bg-[#071D49] text-white" : "border border-[#C8D5EA] bg-white text-[#47658F]"}`}>{candidate === "resource" ? "Room / resource" : candidate === "master" ? "Master school" : candidate}</button>)}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          {view === "class" ? <label className="max-w-sm flex-1 text-xs font-black uppercase text-[#64748B]">Class<select value={effectiveClassId} onChange={(event) => setSelectedClassId(event.target.value)} className={controlClass}>{classes.length === 0 ? <option value="">No classes</option> : classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label> : null}
          {view === "teacher" ? <label className="max-w-sm flex-1 text-xs font-black uppercase text-[#64748B]">Teacher<select value={effectiveTeacherId} onChange={(event) => setSelectedTeacherId(event.target.value)} className={controlClass}>{teachers.length === 0 ? <option value="">No teachers</option> : teachers.map((row) => <option key={teacherId(row)} value={teacherId(row)}>{teacherLabel(row)}</option>)}</select></label> : null}
          {view === "resource" ? <label className="max-w-sm flex-1 text-xs font-black uppercase text-[#64748B]">Exclusive resource<select value={selectedResourceId} onChange={(event) => setSelectedResourceId(event.target.value)} className={controlClass}><option value="">All resources</option>{resources.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label> : null}
          {view === "master" ? <label className="max-w-sm flex-1 text-xs font-black uppercase text-[#64748B]">School day<select value={selectedDay} onChange={(event) => setSelectedDay(Number(event.target.value))} className={controlClass}>{(configuration?.days ?? []).filter((day) => day.is_teaching_day).map((day) => <option key={day.day_of_week} value={day.day_of_week}>{day.name || dayLabel(day.day_of_week)}</option>)}</select></label> : null}
        </div>
        {view === "class" && classes.length > 1 ? <div className="flex gap-2"><button type="button" onClick={() => { const index = Math.max(0, classes.findIndex((row) => row.id === effectiveClassId)); setSelectedClassId(classes[(index - 1 + classes.length) % classes.length].id); }} className="min-h-10 rounded-lg border border-[#C8D5EA] bg-white px-3 text-xs font-black">Previous class</button><button type="button" onClick={() => { const index = Math.max(0, classes.findIndex((row) => row.id === effectiveClassId)); setSelectedClassId(classes[(index + 1) % classes.length].id); }} className="min-h-10 rounded-lg border border-[#C8D5EA] bg-white px-3 text-xs font-black">Next class</button></div> : null}
      </div>
      {published ? <p className="text-xs text-[#64748B]">Filters change only this view; they never copy or mutate published records.</p> : null}
    </div>
  );

  const renderSchedule = (published = false) => {
    const rows = published ? publishedRows : draftRows;
    const query = published ? publishedViewQuery : draftViewQuery;
    if (query.isLoading) return <div className="rounded-xl border border-[#D8E0EC] bg-white p-10 text-center text-sm font-bold text-[#64748B]">Loading tenant-scoped timetable data...</div>;
    if (query.error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-800"><p>The timetable view could not be loaded. Existing records remain unchanged.</p><button type="button" onClick={() => query.refetch()} className="mt-3 min-h-11 rounded-lg border border-rose-300 bg-white px-4">Retry view</button></div>;
    if (rows.length === 0) return <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-8 text-center"><p className="font-black text-amber-950">{published ? "No timetable is published for this selection" : "This view has no placed lessons yet"}</p><p className="mt-1 text-sm text-amber-800">{published ? "Review the draft and publish only after server validation." : "Generate the maximum-valid draft, place an unresolved requirement, or use Build Manually."}</p>{!published ? <button type="button" onClick={() => setActiveTab("command")} className="mt-4 min-h-11 rounded-lg bg-amber-900 px-4 text-sm font-black text-white">Open readiness & generation</button> : null}</div>;
    return <TimetableScheduleView rows={rows} view={view} configuration={configuration} selectedDay={selectedDay} onSelectedDayChange={setSelectedDay} editable={!published && isEditableDraft} onMove={(slot) => openPlacement({ kind: "slot", slot })} onMoveTo={moveTo} onEdit={openEditSlot} onLock={toggleLock} onRemove={removeSlot} />;
  };

  return (
    <div className="space-y-5" data-testid="deputy-timetable-management-workspace">
      <section className="rounded-xl border border-[#D8E0EC] bg-white p-4 text-[#071D49] sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#47658F]"><CalendarClock className="h-4 w-4" /> Smart timetable & relief</p><h2 className="mt-2 text-2xl font-black">Timetable command centre</h2><p className="mt-1 max-w-3xl text-sm text-[#64748B]">Configure scheduling rules, generate the maximum valid draft, review from four perspectives, publish an immutable version, and manage daily relief.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-black">Academic year<select aria-label="Timetable academic year" value={academicYear} onChange={(event) => { setSelectedYearName(event.target.value); setSelectedTermName(""); setValidation(null); }} className={controlClass}>{years.length === 0 ? <option value="">No academic year</option> : years.map((year) => <option key={year.id} value={year.name}>{year.name}</option>)}</select></label>
            <label className="text-sm font-black">Term<select aria-label="Timetable term" value={termName} onChange={(event) => { setSelectedTermName(event.target.value); setValidation(null); }} className={controlClass}>{terms.length === 0 ? <option value="">No term</option> : terms.map((term) => <option key={term.id} value={term.name}>{term.name}</option>)}</select></label>
          </div>
        </div>
      </section>

      <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${saveState === "failed" ? "border-rose-200 bg-rose-50 text-rose-800" : saveState === "queued" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-[#D8E0EC] bg-[#F8FAFC] text-[#47658F]"}`} aria-live="polite">{saveStateLabel(saveState)}</div>

      <nav className="flex gap-2 overflow-x-auto rounded-xl border border-[#D8E0EC] bg-white p-2" aria-label="Timetable workspace tabs">
        {([[
          "command", "Command centre"], ["setup", "Scheduler setup"], ["draft", "Draft review"], ["published", "Published"], ["relief", "Relief"], ["history", "History"]] as Array<[WorkspaceTab, string]>).map(([id, label]) => <button key={id} type="button" onClick={() => setActiveTab(id)} className={`min-h-11 shrink-0 rounded-lg px-4 text-sm font-black ${activeTab === id ? "bg-[#071D49] text-white" : "text-[#47658F] hover:bg-[#EEF4FF]"}`}>{label}</button>)}
      </nav>

      {activeTab === "command" ? <>
        <TimetableReadinessPanel readiness={readinessQuery.data} loading={readinessQuery.isLoading} error={readinessQuery.error} onRetry={() => readinessQuery.refetch()} />
        <section className="rounded-xl border border-[#D8E0EC] bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div><h3 className="text-lg font-black text-[#071D49]">{plannerSlots.length === 0 ? "Create the school timetable" : "Review and complete the current draft"}</h3><p className="mt-1 text-sm text-[#64748B]">{plannerSlots.length === 0 ? "Generation consumes configured periods, requirements, academic allocations, availability, and resources." : `${plannerSlots.length} lesson placements are in the current version. Publishing remains blocked until server validation passes.`}</p></div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {plannerSlots.length === 0 ? <button type="button" onClick={generate} disabled={readinessBlocksGeneration || generateMutation.isPending} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#174EA6] px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"><WandSparkles className="h-5 w-5" /> {generateMutation.isPending ? "Generating..." : "Generate Timetable"}</button> : <button type="button" onClick={() => setPublishModalOpen(true)} disabled={!isEditableDraft || pendingAction} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white disabled:opacity-50"><CheckCircle2 className="h-5 w-5" /> Publish Timetable</button>}
              <button type="button" onClick={choosePreviousVersion} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#C8D5EA] bg-white px-4 text-sm font-black text-[#071D49]"><Copy className="h-4 w-4" /> Copy Previous</button>
              <button type="button" onClick={() => { setActiveTab("draft"); openCreateSlot(); }} disabled={!isEditableDraft && Boolean(version)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#C8D5EA] bg-white px-4 text-sm font-black text-[#071D49] disabled:opacity-50"><Plus className="h-4 w-4" /> Build Manually</button>
              <button type="button" onClick={() => setAdvancedOpen((open) => !open)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#C8D5EA] bg-white px-4 text-sm font-black text-[#071D49]"><MoreHorizontal className="h-4 w-4" /> Advanced <ChevronDown className={`h-4 w-4 transition ${advancedOpen ? "rotate-180" : ""}`} /></button>
            </div>
          </div>
          {advancedOpen ? <div className="mt-4 grid gap-4 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 lg:grid-cols-2">
            <div><p className="font-black text-[#071D49]">Draft controls</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => checkConflicts()} disabled={validationLoading || plannerSlots.length === 0} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-black"><Search className="h-4 w-4" /> {validationLoading ? "Checking..." : "Check Conflicts"}</button><button type="button" onClick={autoFix} disabled={!isEditableDraft || autoFixMutation.isPending} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-black"><Sparkles className="h-4 w-4" /> Auto-fix</button><button type="button" onClick={() => performHistoryOperation("undo")} disabled={operationIndex === 0} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-black disabled:opacity-40"><Undo2 className="h-4 w-4" /> Undo</button><button type="button" onClick={() => performHistoryOperation("redo")} disabled={operationIndex >= operations.length} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-black disabled:opacity-40"><Redo2 className="h-4 w-4" /> Redo</button><button type="button" onClick={async () => { setSaveState("saving"); try { await checkConflicts(true); setSaveState("saved"); toast.success("The server confirmed the current draft state."); } catch { setSaveState("failed"); } }} disabled={validationLoading} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-black"><Save className="h-4 w-4" /> Save Draft</button></div></div>
            <div><p className="font-black text-[#071D49]">Scoped regeneration</p><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]"><select aria-label="Regeneration scope" value={scopeType} onChange={(event) => { const next = event.target.value as typeof scopeType; setScopeType(next); setScopeId(""); }} className="h-11 rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-bold"><option value="school">Whole school</option><option value="class">One class</option><option value="teacher">One teacher</option><option value="requirement">One requirement</option></select><select aria-label="Regeneration target" value={scopeId} onChange={(event) => setScopeId(event.target.value)} disabled={scopeType === "school"} className="h-11 rounded-lg border border-[#C8D5EA] bg-white px-3 text-sm font-bold disabled:opacity-50"><option value="">Select scope</option>{scopeOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><button type="button" onClick={regenerate} disabled={!isEditableDraft || (scopeType !== "school" && !scopeId) || regenerateMutation.isPending} className="min-h-11 rounded-lg bg-[#071D49] px-4 text-sm font-black text-white disabled:opacity-50">Regenerate</button></div><p className="mt-2 text-xs text-[#64748B]">Locked lessons and unaffected scopes remain unchanged.</p></div>
          </div> : null}
        </section>
        {generationSummary ? <GenerationSummaryPanel result={generationSummary} onClose={() => setGenerationSummary(null)} /> : null}
        {copyReviewIssues.length > 0 ? <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-black">Copied timetable needs review</h3><p className="mt-1 text-sm">{copyReviewIssues.length} source lesson{copyReviewIssues.length === 1 ? " was" : "s were"} left out because a current class, stream, allocation, resource, or teaching-period structure no longer matches.</p></div><button type="button" onClick={() => setCopyReviewIssues([])} className="min-h-10 rounded-lg border border-amber-400 bg-white px-3 text-sm font-black">Dismiss</button></div><ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{copyReviewIssues.map((issue, index) => <li key={`${issue.source_slot_id ?? index}-${issue.code}`}><strong>{issue.code}:</strong> {issue.message}</li>)}</ul></section> : null}
        {validation ? <section className={`rounded-xl border p-4 ${validation.valid ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}><h3 className="font-black">{validation.valid ? "Server validation passed" : "Hard conflicts block publishing"}</h3><p className="mt-1 text-sm">{validation.summary.slots} slots - {validation.summary.hard_conflicts} hard conflicts - {validation.summary.warnings} warnings - {validation.summary.unscheduled} unscheduled</p>{validation.hard_conflicts.length > 0 ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{validation.hard_conflicts.map((conflict) => <li key={`${conflict.code}-${conflict.message}`}><strong>{conflict.code}:</strong> {conflict.message}</li>)}</ul> : null}</section> : null}
        <UnscheduledLessonsPanel items={unscheduledQuery.data?.items ?? []} classes={classes} subjects={subjects} teachers={teachers} resources={resources} loading={unscheduledQuery.isLoading} error={unscheduledQuery.error} onRetry={() => unscheduledQuery.refetch()} onPlace={(item) => openPlacement({ kind: "unscheduled", item })} />
      </> : null}

      {activeTab === "setup" ? <section className="space-y-5 rounded-xl border border-[#D8E0EC] bg-white p-4 sm:p-5">
        <div><h3 className="flex items-center gap-2 text-xl font-black text-[#071D49]"><Settings2 className="h-5 w-5" /> Scheduler setup</h3><p className="mt-1 text-sm text-[#64748B]">Timetable-specific rules live here. Academic years, classes, subjects, and teacher allocations stay in the existing Academic Setup workspace.</p><Link href="/school/deputy-principal/academics" className="mt-2 inline-flex text-sm font-black text-[#174EA6] underline">Open Academic Setup for allocations</Link></div>
        <div className="flex gap-2 overflow-x-auto border-b border-[#D8E0EC] pb-3">{([ ["periods", "School days & periods"], ["requirements", "Subject requirements"], ["availability", "Teacher availability"], ["resources", "Rooms & resources"] ] as Array<[SetupTab, string]>).map(([id, label]) => <button key={id} type="button" onClick={() => setSetupTab(id)} className={`min-h-11 shrink-0 rounded-lg px-4 text-sm font-black ${setupTab === id ? "bg-[#174EA6] text-white" : "border border-[#C8D5EA] bg-white"}`}>{label}</button>)}</div>
        {setupTab === "periods" ? <PeriodConfigurationPanel response={configurationQuery.data} academicYear={academicYear} termName={termName} classes={classes} loading={configurationQuery.isLoading} error={configurationQuery.error} onRetry={() => configurationQuery.refetch()} onSaved={() => Promise.all([configurationQuery.refetch(), readinessQuery.refetch()])} onSaveState={setSaveState} /> : null}
        {setupTab === "requirements" ? <SubjectRequirementsPanel response={requirementsQuery.data} academicYear={academicYear} termName={termName} classes={classes} subjects={subjects} teachers={teachers} resources={resources} loading={requirementsQuery.isLoading} error={requirementsQuery.error} onRetry={() => requirementsQuery.refetch()} onSaved={() => Promise.all([requirementsQuery.refetch(), readinessQuery.refetch()])} onSaveState={setSaveState} /> : null}
        {setupTab === "availability" ? <TeacherAvailabilityPanel response={availabilityQuery.data} configuration={configuration} academicYear={academicYear} termName={termName} teachers={teachers} loading={availabilityQuery.isLoading} error={availabilityQuery.error} onRetry={() => availabilityQuery.refetch()} onSaved={() => Promise.all([availabilityQuery.refetch(), readinessQuery.refetch()])} onSaveState={setSaveState} /> : null}
        {setupTab === "resources" ? <TimetableResourcesPanel response={resourcesQuery.data} loading={resourcesQuery.isLoading} error={resourcesQuery.error} onRetry={() => resourcesQuery.refetch()} onSaved={() => Promise.all([resourcesQuery.refetch(), readinessQuery.refetch()])} onSaveState={setSaveState} /> : null}
      </section> : null}

      {activeTab === "draft" ? <section className="space-y-4 rounded-xl border border-[#D8E0EC] bg-white p-4 text-[#071D49] sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div><h3 className="text-xl font-black">Draft timetable review</h3><p className="mt-1 text-sm text-[#64748B]">Tap Move on mobile for valid periods. Drag unlocked cards between configured teaching periods on desktop; every drop is validated by the server.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => performHistoryOperation("undo")} disabled={operationIndex === 0} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#C8D5EA] px-3 text-sm font-black disabled:opacity-40"><Undo2 className="h-4 w-4" /> Undo</button><button type="button" onClick={() => performHistoryOperation("redo")} disabled={operationIndex >= operations.length} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#C8D5EA] px-3 text-sm font-black disabled:opacity-40"><Redo2 className="h-4 w-4" /> Redo</button><button type="button" onClick={openCreateSlot} disabled={!isEditableDraft} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#C8D5EA] px-3 text-sm font-black disabled:opacity-40"><Plus className="h-4 w-4" /> Add lesson</button><button type="button" onClick={() => checkConflicts()} disabled={validationLoading || plannerSlots.length === 0} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#C8D5EA] px-3 text-sm font-black"><Search className="h-4 w-4" /> Check conflicts</button><button type="button" onClick={() => setPublishModalOpen(true)} disabled={!isEditableDraft || plannerSlots.length === 0} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-black text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> Publish</button></div></div>
        {renderViewControls()}
        {renderSchedule()}
        <UnscheduledLessonsPanel items={unscheduledQuery.data?.items ?? []} classes={classes} subjects={subjects} teachers={teachers} resources={resources} loading={unscheduledQuery.isLoading} error={unscheduledQuery.error} onRetry={() => unscheduledQuery.refetch()} onPlace={(item) => openPlacement({ kind: "unscheduled", item })} />
      </section> : null}

      {activeTab === "published" ? <section className="space-y-4 rounded-xl border border-[#D8E0EC] bg-white p-4 text-[#071D49] sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div><h3 className="text-xl font-black">Published timetable</h3><p className="mt-1 text-sm text-[#64748B]">This historical version is read-only and is the schedule exposed to authorized school portals.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={printSchedule} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#C8D5EA] px-3 text-sm font-black"><Printer className="h-4 w-4" /> Preview / Print</button><button type="button" onClick={downloadCsv} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#C8D5EA] px-3 text-sm font-black"><Download className="h-4 w-4" /> Download CSV</button>{publishedViewQuery.data?.version ? <button type="button" onClick={() => createRevision(historyItems.find((item) => item.id === historyQuery.data?.active_published_id))} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#174EA6] px-4 text-sm font-black text-white"><Pencil className="h-4 w-4" /> Create revision</button> : null}</div></div>
        {renderViewControls(true)}
        {renderSchedule(true)}
      </section> : null}

      {activeTab === "relief" ? <DeputyTimetableReliefWorkspace academicYear={academicYear} termName={termName} /> : null}
      {activeTab === "history" ? <TimetableHistoryPanel items={historyItems} activePublishedId={historyQuery.data?.active_published_id} draftId={historyQuery.data?.draft_id} loading={historyQuery.isLoading} error={historyQuery.error} onRetry={() => historyQuery.refetch()} onCopy={setCopySource} onRevise={createRevision} /> : null}

      <Modal open={slotModalOpen} onClose={() => setSlotModalOpen(false)} title={editingSlotId ? "Edit draft lesson" : "Build lesson manually"}>
        <form onSubmit={submitSlot} className="grid gap-4 py-3 sm:grid-cols-2">
          <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900 sm:col-span-2">Manual building uses existing academic allocations and configured teaching periods. The server still applies every hard constraint.</p>
          <label className="text-sm font-black sm:col-span-2">Class<select required value={slotDraft.class_section_id} onChange={(event) => setSlotDraft((current) => ({ ...current, class_section_id: event.target.value, subject_id: "", teacher_id: "" }))} className={controlClass}><option value="">Select class</option>{classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          <label className="text-sm font-black">Subject<select required value={slotDraft.subject_id} onChange={(event) => setSlotDraft((current) => ({ ...current, subject_id: event.target.value, teacher_id: "" }))} className={controlClass}><option value="">Select allocated subject</option>{subjectOptions.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>{slotDraft.class_section_id && subjectOptions.length === 0 ? <span className="mt-1 block text-xs text-amber-700">No teacher-subject allocation exists for this class and term. Fix it in Academic Setup.</span> : null}</label>
          <label className="text-sm font-black">Teacher<select required value={slotDraft.teacher_id} onChange={(event) => setSlotDraft((current) => ({ ...current, teacher_id: event.target.value }))} className={controlClass}><option value="">Select allocated teacher</option>{teacherOptions.map((row) => <option key={teacherId(row)} value={teacherId(row)}>{teacherLabel(row)}</option>)}</select></label>
          <label className="text-sm font-black">Day<select required value={slotDraft.day_of_week} onChange={(event) => { const day = Number(event.target.value); const first = configuredDays.find((candidate) => candidate.day_of_week === day)?.periods.find((period) => period.is_teaching); applyPeriod(first, day); }} className={controlClass}>{configuredDays.map((day) => <option key={day.day_of_week} value={day.day_of_week}>{day.name || dayLabel(day.day_of_week)}</option>)}</select></label>
          <label className="text-sm font-black">Teaching period<select required value={slotDraft.period_id} onChange={(event) => applyPeriod(configuredPeriods.find((period) => period.id === event.target.value))} className={controlClass}><option value="">Select period</option>{configuredPeriods.map((period) => <option key={period.id} value={period.id}>{period.name} - {timeLabel(period.starts_at)}-{timeLabel(period.ends_at)}</option>)}</select></label>
          <label className="text-sm font-black">Resource<select value={slotDraft.resource_id ?? ""} onChange={(event) => setSlotDraft((current) => ({ ...current, resource_id: event.target.value }))} className={controlClass}><option value="">General classroom</option>{resources.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
          <label className="text-sm font-black">Room note<input value={slotDraft.room_id ?? ""} onChange={(event) => setSlotDraft((current) => ({ ...current, room_id: event.target.value }))} placeholder="Optional ordinary classroom" className={controlClass} /></label>
          <label className="text-sm font-black">Duration (periods)<input type="number" min={1} max={4} value={slotDraft.duration_periods ?? 1} onChange={(event) => setSlotDraft((current) => ({ ...current, duration_periods: Number(event.target.value) }))} className={controlClass} /></label>
          <label className="text-sm font-black">Parallel group<input value={slotDraft.parallel_key ?? ""} onChange={(event) => setSlotDraft((current) => ({ ...current, parallel_key: event.target.value }))} placeholder="Optional shared group" className={controlClass} /></label>
          <div className="flex flex-col-reverse gap-2 border-t border-[#E2E8F0] pt-4 sm:col-span-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setSlotModalOpen(false)} className="min-h-11 rounded-lg border border-[#C8D5EA] px-4 font-bold">Cancel</button><button type="submit" disabled={createMutation.isPending || updateMutation.isPending || !slotDraft.teacher_id || !slotDraft.period_id} className="min-h-11 rounded-lg bg-[#174EA6] px-4 font-black text-white disabled:opacity-50">{createMutation.isPending || updateMutation.isPending ? "Validating & saving..." : editingSlotId ? "Save changes" : "Add to draft"}</button></div>
        </form>
      </Modal>

      <Modal open={publishModalOpen} onClose={() => setPublishModalOpen(false)} title="Validate and publish timetable">
        <div className="space-y-4 py-3 text-[#071D49]">
          <p className="text-sm text-[#64748B]">Publishing runs the centralized conflict engine again, blocks all hard conflicts, creates an immutable version, and makes it active for authorized school users. Non-critical warnings require an explicit acknowledgement.</p>
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#F8FAFC] p-3 text-center">
            <div><p className="text-xs text-[#64748B]">Placed</p><p className="text-xl font-black">{plannerSlots.length}</p></div>
            <div><p className="text-xs text-[#64748B]">Unscheduled</p><p className="text-xl font-black text-amber-700">{unscheduledQuery.data?.items.length ?? 0}</p></div>
            <div><p className="text-xs text-[#64748B]">Hard conflicts</p><p className="text-xl font-black text-rose-700">{validation?.summary.hard_conflicts ?? "Check"}</p></div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-blue-900">Publication impact</p>
            <p className="mt-1 text-sm text-blue-950">{publicationImpact ? publicationImpact.baseline ? "This first published version establishes the timetable used by school portals, workload views, resource occupancy, and relief discovery." : "These are the actual changes from the source published version. Activating them updates affected school portals, workload views, resource occupancy, and relief discovery." : "Run server validation to calculate the exact impact against the source published version before publishing."}</p>
            {publicationImpact ? <><div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4"><div className="rounded-lg bg-white p-2"><p className="text-lg font-black">{publicationImpact.added_lessons}</p><p className="text-[10px] font-bold uppercase text-[#64748B]">Added lessons</p></div><div className="rounded-lg bg-white p-2"><p className="text-lg font-black">{publicationImpact.updated_lessons}</p><p className="text-[10px] font-bold uppercase text-[#64748B]">Updated lessons</p></div><div className="rounded-lg bg-white p-2"><p className="text-lg font-black">{publicationImpact.removed_lessons}</p><p className="text-[10px] font-bold uppercase text-[#64748B]">Removed lessons</p></div><div className="rounded-lg bg-white p-2"><p className="text-lg font-black">{publicationImpact.changed_lessons}</p><p className="text-[10px] font-bold uppercase text-[#64748B]">Total changes</p></div></div><div className="mt-2 grid grid-cols-2 gap-2 text-center sm:grid-cols-5">{([ ["Classes", publicationImpact.class_count], ["Teachers", publicationImpact.teacher_count], ["Streams", publicationImpact.stream_count], ["Resources", publicationImpact.resource_count], ["Parallel groups", publicationImpact.parallel_group_count] ] as Array<[string, number]>).map(([label, value]) => <div key={label} className="rounded-lg bg-white p-2"><p className="text-lg font-black">{value}</p><p className="text-[10px] font-bold uppercase text-[#64748B]">{label}</p></div>)}</div></> : <button type="button" onClick={() => checkConflicts()} disabled={validationLoading} className="mt-3 min-h-10 rounded-lg border border-blue-300 bg-white px-3 text-sm font-black text-blue-900">{validationLoading ? "Calculating impact..." : "Validate and calculate impact"}</button>}
          </div>
          {((validation?.warnings.length ?? 0) > 0 || (unscheduledQuery.data?.items.length ?? 0) > 0) ? (
            <label className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-950">
              <input type="checkbox" checked={acknowledgeWarnings} onChange={(event) => setAcknowledgeWarnings(event.target.checked)} className="mt-1" />
              <span>I have reviewed the non-critical warnings and unscheduled lessons and explicitly approve publishing this version with those items recorded.</span>
            </label>
          ) : null}
          <label className="block text-sm font-black">Publication notes<textarea value={publicationNotes} onChange={(event) => setPublicationNotes(event.target.value)} rows={3} maxLength={1000} placeholder="Optional revision notes" className="mt-1 w-full rounded-lg border border-[#C8D5EA] p-3" /></label>
          <div className="flex flex-col-reverse gap-2 border-t border-[#E2E8F0] pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={() => setPublishModalOpen(false)} className="min-h-11 rounded-lg border border-[#C8D5EA] px-4 font-bold">Keep draft</button><button type="button" onClick={publish} disabled={publishMutation.isPending || validationLoading} className="min-h-11 rounded-lg bg-emerald-700 px-4 font-black text-white disabled:opacity-50">{publishMutation.isPending || validationLoading ? "Validating..." : "Publish immutable version"}</button></div>
        </div>
      </Modal>

      <Modal open={Boolean(copySource)} onClose={() => setCopySource(null)} title="Copy previous timetable">
        <div className="space-y-4 py-3 text-[#071D49]"><p className="text-sm text-[#64748B]">Copy revision <strong>{copySource?.revision_number ?? "selected"}</strong> into a new {academicYear} {termName} draft. The source remains immutable. The server will flag changed allocations, missing classes, resources, or periods for review.</p><div className="flex flex-col-reverse gap-2 border-t border-[#E2E8F0] pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={() => setCopySource(null)} className="min-h-11 rounded-lg border border-[#C8D5EA] px-4 font-bold">Cancel</button><button type="button" onClick={copyPrevious} disabled={copyMutation.isPending} className="min-h-11 rounded-lg bg-[#174EA6] px-4 font-black text-white disabled:opacity-50">{copyMutation.isPending ? "Copying & validating..." : "Create reviewable copy"}</button></div></div>
      </Modal>

      <Modal open={Boolean(placementTarget)} onClose={() => setPlacementTarget(null)} title={placementTarget?.kind === "slot" ? "Move lesson to a valid period" : "Place unscheduled lesson"}>
        <div className="space-y-4 py-3 text-[#071D49]"><p className="text-sm text-[#64748B]">The server checked configured teaching periods, teacher/class/resource clashes, availability, consecutive duration, locks, and academic allocations. Choose a VALID or PREFERRED destination.</p><button type="button" onClick={() => placementTarget && openPlacement(placementTarget, true)} disabled={candidateLoading} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#174EA6] bg-blue-50 px-4 text-sm font-black text-[#174EA6]"><Sparkles className="h-4 w-4" /> Find Best Slot</button>{candidateLoading ? <div className="rounded-xl bg-[#F8FAFC] p-8 text-center text-sm font-bold text-[#64748B]">Calculating safe candidate periods...</div> : candidateError ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800"><p>{candidateError}</p><button type="button" onClick={() => placementTarget && openPlacement(placementTarget)} className="mt-2 min-h-10 rounded-lg border border-rose-300 bg-white px-3">Retry</button></div> : candidateSlots.length === 0 ? <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-5 text-sm font-bold text-amber-900">No valid destination currently exists. Adjust availability, configuration, locks, or another placement; random invalid periods are not offered.</div> : <div className="max-h-[50vh] space-y-2 overflow-y-auto">{candidateSlots.map((candidate) => { const period = periodFor(configuration, candidate.day_of_week, candidate.period_id); const key = `${candidate.day_of_week}-${candidate.period_id}`; return <label key={key} className={`block cursor-pointer rounded-xl border p-3 ${selectedCandidate?.day_of_week === candidate.day_of_week && selectedCandidate.period_id === candidate.period_id ? "border-[#174EA6] bg-blue-50" : "border-[#D8E0EC] bg-white"}`}><div className="flex items-start gap-3"><input type="radio" name="candidate_slot" checked={selectedCandidate?.day_of_week === candidate.day_of_week && selectedCandidate.period_id === candidate.period_id} onChange={() => setSelectedCandidate(candidate)} className="mt-1" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-black">{dayLabel(candidate.day_of_week)} - {period?.name ?? candidate.period_id}</span><span className={`rounded-full px-2 py-1 text-[10px] font-black ${candidate.state === "PREFERRED" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>{candidate.state}{candidate.score != null ? ` - ${candidate.score}` : ""}</span></div><p className="mt-1 text-xs text-[#64748B]">{period ? `${timeLabel(period.starts_at)}-${timeLabel(period.ends_at)}` : "Configured period"}</p>{candidate.reasons.length > 0 ? <ul className="mt-2 list-disc pl-4 text-xs text-[#475569]">{candidate.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : null}</div></div></label>; })}</div>}<div className="flex flex-col-reverse gap-2 border-t border-[#E2E8F0] pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={() => setPlacementTarget(null)} className="min-h-11 rounded-lg border border-[#C8D5EA] px-4 font-bold">Cancel</button><button type="button" onClick={confirmPlacement} disabled={!selectedCandidate || slotActionPending} className="min-h-11 rounded-lg bg-[#174EA6] px-4 font-black text-white disabled:opacity-50">{slotActionPending ? "Validating & saving..." : "Confirm destination"}</button></div></div>
      </Modal>
    </div>
  );
}
