"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";

type EditorTheme = "dark" | "light";

type GradeBandState = {
  id: string;
  label: string;
  min: string;
  max: string;
  points: string;
  remark: string;
  isPass: boolean;
  extra: Record<string, unknown>;
};

type AttendanceConfiguration = {
  sessions: string[];
  late_after: string;
  extra: Record<string, unknown>;
};

type ReportCardConfiguration = {
  classTeacherComment: boolean;
  principalComment: boolean;
  signatureLines: string[];
  extra: Record<string, unknown>;
};

const SECONDARY_GRADE_BANDS = [
  { label: "A", min: 80, max: 100, points: 12, remark: "Very Good", is_pass: true },
  { label: "A-", min: 75, max: 79, points: 11, remark: "Very Good", is_pass: true },
  { label: "B+", min: 70, max: 74, points: 10, remark: "Good", is_pass: true },
  { label: "B", min: 65, max: 69, points: 9, remark: "Good", is_pass: true },
  { label: "B-", min: 60, max: 64, points: 8, remark: "Good", is_pass: true },
  { label: "C+", min: 55, max: 59, points: 7, remark: "Average", is_pass: true },
  { label: "C", min: 45, max: 54, points: 6, remark: "Average", is_pass: true },
  { label: "C-", min: 40, max: 44, points: 5, remark: "Average", is_pass: true },
  { label: "D+", min: 35, max: 39, points: 4, remark: "Average", is_pass: true },
  { label: "D", min: 30, max: 34, points: 3, remark: "Weak", is_pass: true },
  { label: "D-", min: 25, max: 29, points: 2, remark: "Weak", is_pass: true },
  { label: "E", min: 0, max: 24, points: 1, remark: "Poor", is_pass: false },
];

const CBC_GRADE_BANDS = [
  { label: "EE1", min: 90, max: 100, points: 8, remark: "Exceeding Expectation", is_pass: true },
  { label: "EE2", min: 75, max: 89, points: 7, remark: "Exceeding Expectation", is_pass: true },
  { label: "ME1", min: 58, max: 74, points: 6, remark: "Meeting Expectation", is_pass: true },
  { label: "ME2", min: 41, max: 57, points: 5, remark: "Meeting Expectation", is_pass: true },
  { label: "AE1", min: 31, max: 40, points: 4, remark: "Approaching Expectation", is_pass: true },
  { label: "AE2", min: 21, max: 30, points: 3, remark: "Approaching Expectation", is_pass: true },
  { label: "BE1", min: 11, max: 20, points: 2, remark: "Below Expectation", is_pass: false },
  { label: "BE2", min: 0, max: 10, points: 1, remark: "Below Expectation", is_pass: false },
];

const themeClasses = {
  dark: {
    label: "text-white",
    muted: "text-white/60",
    input: "border-white/15 bg-[#0D2A5B] text-white placeholder:text-white/35 focus:border-cyan-300",
    panel: "border-white/10 bg-white/[0.04]",
    row: "border-white/10 bg-white/[0.04]",
    secondaryButton: "border-white/15 bg-white/5 text-white hover:bg-white/10",
    dangerButton: "border-red-200/20 bg-red-300/10 text-red-100 hover:bg-red-300/20",
    chip: "border-white/15 bg-white/5 text-white",
  },
  light: {
    label: "text-slate-700",
    muted: "text-slate-500",
    input: "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500",
    panel: "border-slate-200 bg-slate-50",
    row: "border-slate-200 bg-white",
    secondaryButton: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    dangerButton: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    chip: "border-slate-200 bg-white text-slate-700",
  },
} as const;

const baseInputClass =
  "mt-1 min-h-10 w-full rounded-lg border px-3 py-2 text-sm font-semibold outline-none transition";

let gradeBandSequence = 0;

function nextGradeBandId() {
  gradeBandSequence += 1;
  return `grade-band-${gradeBandSequence}`;
}

function numberText(value: unknown, fallback = "") {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : typeof value === "string" && value.trim()
      ? value.trim()
      : fallback;
}

function gradeBandState(value: Record<string, unknown>): GradeBandState {
  const {
    label,
    min,
    max,
    min_score: minScore,
    max_score: maxScore,
    points,
    remark,
    descriptor,
    is_pass: isPass,
    ...extra
  } = value;

  return {
    id: nextGradeBandId(),
    label: String(label ?? ""),
    min: numberText(min ?? minScore),
    max: numberText(max ?? maxScore),
    points: numberText(points),
    remark: String(remark ?? descriptor ?? ""),
    isPass: typeof isPass === "boolean" ? isPass : true,
    extra,
  };
}

function blankGradeBand(): GradeBandState {
  return gradeBandState({
    label: "",
    min: 0,
    max: 100,
    points: "",
    remark: "",
    is_pass: true,
  });
}

function initialGradeBands(
  input: unknown,
  initialPreset: "secondary" | "cbc" | "blank",
) {
  if (Array.isArray(input) && input.length > 0) {
    return input
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map(gradeBandState);
  }
  if (initialPreset === "cbc") return CBC_GRADE_BANDS.map(gradeBandState);
  if (initialPreset === "blank") return [blankGradeBand()];
  return SECONDARY_GRADE_BANDS.map(gradeBandState);
}

function serializedGradeBands(rows: GradeBandState[]) {
  return rows.map((row) => ({
    ...row.extra,
    label: row.label.trim(),
    min: row.min.trim() === "" ? null : Number(row.min),
    max: row.max.trim() === "" ? null : Number(row.max),
    points: row.points.trim() === "" ? null : Number(row.points),
    remark: row.remark.trim(),
    is_pass: row.isPass,
  }));
}

export function validateAcademicGradeBands(input: unknown): string | null {
  if (!Array.isArray(input) || input.length === 0) {
    return "Add at least one grade band.";
  }

  const normalized = input.map((item) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      label: String(record.label ?? "").trim(),
      min: Number(record.min ?? record.min_score),
      max: Number(record.max ?? record.max_score),
      points: record.points === null || record.points === undefined || record.points === ""
        ? null
        : Number(record.points),
    };
  });

  const labels = new Set<string>();
  for (const band of normalized) {
    if (!band.label) return "Every grade band needs a label.";
    const labelKey = band.label.toLowerCase();
    if (labels.has(labelKey)) return `Grade label "${band.label}" is duplicated.`;
    labels.add(labelKey);
    if (!Number.isFinite(band.min) || !Number.isFinite(band.max)) {
      return `${band.label} needs valid minimum and maximum marks.`;
    }
    if (!Number.isInteger(band.min) || !Number.isInteger(band.max)) {
      return `${band.label} must use whole-number mark boundaries.`;
    }
    if (band.min < 0 || band.max > 100 || band.min > band.max) {
      return `${band.label} must stay between 0 and 100, with minimum not above maximum.`;
    }
    if (band.points !== null && (!Number.isFinite(band.points) || band.points < 0)) {
      return `${band.label} points must be zero or greater.`;
    }
  }

  const ordered = [...normalized].sort((left, right) => left.min - right.min);
  if (ordered[0].min !== 0 || ordered.at(-1)?.max !== 100) {
    return "Grade bands must cover every mark from 0 to 100.";
  }
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (current.min <= previous.max) {
      return `${previous.label} and ${current.label} overlap. Adjust their mark ranges.`;
    }
    if (current.min !== previous.max + 1) {
      return `There is an uncovered mark range between ${previous.label} and ${current.label}.`;
    }
  }

  return null;
}

function normalizeAttendanceConfiguration(input: unknown): AttendanceConfiguration {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const sessions = Array.isArray(value.sessions)
    ? value.sessions.map(String).filter(Boolean)
    : ["morning", "afternoon"];
  const { sessions: _sessions, late_after: _lateAfter, ...extra } = value;
  return {
    sessions,
    late_after: typeof value.late_after === "string" ? value.late_after : "08:00",
    extra,
  };
}

export function validateAttendanceConfiguration(input: unknown): string | null {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  if (!Array.isArray(value.sessions) || value.sessions.length === 0) {
    return "Select at least one attendance register session.";
  }
  if (typeof value.late_after !== "string" || !/^\d{2}:\d{2}$/.test(value.late_after)) {
    return "Choose a valid time for marking learners late.";
  }
  return null;
}

function normalizeReportCardConfiguration(input: unknown): ReportCardConfiguration {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const {
    class_teacher_comment: _classTeacherComment,
    principal_comment: _principalComment,
    signature_lines: _signatureLines,
    ...extra
  } = value;
  return {
    classTeacherComment: value.class_teacher_comment !== false,
    principalComment: value.principal_comment !== false,
    signatureLines: Array.isArray(value.signature_lines)
      ? value.signature_lines.map(String).filter(Boolean)
      : ["Class Teacher", "Principal"],
    extra,
  };
}

function useFormReset(containerRef: RefObject<HTMLDivElement | null>, reset: () => void) {
  useEffect(() => {
    const form = containerRef.current?.closest("form");
    if (!form) return;
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [containerRef, reset]);
}

export function AcademicGradeBandsEditor({
  name,
  label = "Grade bands and assessment rules",
  defaultValue,
  initialPreset = "secondary",
  theme = "dark",
}: {
  name: string;
  label?: string;
  defaultValue?: unknown;
  initialPreset?: "secondary" | "cbc" | "blank";
  theme?: EditorTheme;
}) {
  const buildInitialRows = useCallback(
    () => initialGradeBands(defaultValue, initialPreset),
    [defaultValue, initialPreset],
  );
  const [rows, setRows] = useState<GradeBandState[]>(buildInitialRows);
  const containerRef = useRef<HTMLDivElement>(null);
  const styles = themeClasses[theme];
  const serialized = useMemo(() => serializedGradeBands(rows), [rows]);
  const validation = validateAcademicGradeBands(serialized);

  const resetRows = useCallback(() => setRows(buildInitialRows()), [buildInitialRows]);

  useEffect(resetRows, [resetRows]);
  useFormReset(containerRef, resetRows);

  const update = (id: string, change: Partial<GradeBandState>) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...change } : row));
  };

  const applyPreset = (preset: "secondary" | "cbc") => {
    setRows((preset === "secondary" ? SECONDARY_GRADE_BANDS : CBC_GRADE_BANDS).map(gradeBandState));
  };

  return (
    <div ref={containerRef} className={`rounded-xl border p-3 sm:p-4 ${styles.panel}`}>
      <input type="hidden" name={name} value={JSON.stringify(serialized)} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={`text-sm font-black ${styles.label}`}>{label}</p>
          <p className={`mt-1 text-xs font-semibold ${styles.muted}`}>
            Add one row per outcome. Mark ranges must cover 0 to 100 without gaps or overlaps.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => applyPreset("secondary")} className={`min-h-9 rounded-lg border px-3 text-xs font-bold ${styles.secondaryButton}`}>
            8-4-4
          </button>
          <button type="button" onClick={() => applyPreset("cbc")} className={`min-h-9 rounded-lg border px-3 text-xs font-bold ${styles.secondaryButton}`}>
            CBC
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {rows.map((row, index) => (
          <div key={row.id} className={`grid gap-3 rounded-xl border p-3 sm:grid-cols-2 xl:grid-cols-12 ${styles.row}`}>
            <label className={`text-xs font-bold xl:col-span-2 ${styles.label}`}>
              Grade label
              <input value={row.label} onChange={(event) => update(row.id, { label: event.target.value })} placeholder={index === 0 ? "A or EE1" : "Grade"} className={`${baseInputClass} ${styles.input}`} required />
            </label>
            <label className={`text-xs font-bold xl:col-span-2 ${styles.label}`}>
              Minimum mark
              <input type="number" min="0" max="100" step="1" value={row.min} onChange={(event) => update(row.id, { min: event.target.value })} className={`${baseInputClass} ${styles.input}`} required />
            </label>
            <label className={`text-xs font-bold xl:col-span-2 ${styles.label}`}>
              Maximum mark
              <input type="number" min="0" max="100" step="1" value={row.max} onChange={(event) => update(row.id, { max: event.target.value })} className={`${baseInputClass} ${styles.input}`} required />
            </label>
            <label className={`text-xs font-bold xl:col-span-2 ${styles.label}`}>
              Points
              <input type="number" min="0" step="1" value={row.points} onChange={(event) => update(row.id, { points: event.target.value })} placeholder="Optional" className={`${baseInputClass} ${styles.input}`} />
            </label>
            <label className={`text-xs font-bold sm:col-span-2 xl:col-span-3 ${styles.label}`}>
              Report remark
              <input value={row.remark} onChange={(event) => update(row.id, { remark: event.target.value })} placeholder="e.g. Excellent" className={`${baseInputClass} ${styles.input}`} />
            </label>
            <div className="flex items-end justify-between gap-2 sm:col-span-2 xl:col-span-1 xl:flex-col xl:items-stretch">
              <label className={`flex min-h-10 items-center gap-2 text-xs font-bold ${styles.label}`}>
                <input type="checkbox" checked={row.isPass} onChange={(event) => update(row.id, { isPass: event.target.checked })} />
                Pass
              </label>
              <button
                type="button"
                aria-label={`Remove ${row.label || `grade band ${index + 1}`}`}
                disabled={rows.length === 1}
                onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                className={`inline-flex min-h-9 items-center justify-center rounded-lg border px-2 disabled:cursor-not-allowed disabled:opacity-35 ${styles.dangerButton}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={() => setRows((current) => [...current, blankGradeBand()])} className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold ${styles.secondaryButton}`}>
          <Plus className="h-4 w-4" /> Add grade band
        </button>
        <p aria-live="polite" className={`text-xs font-bold ${validation ? "text-amber-300" : theme === "dark" ? "text-emerald-300" : "text-emerald-700"}`}>
          {validation ?? `${rows.length} grade bands cover every mark from 0 to 100.`}
        </p>
      </div>
    </div>
  );
}

export function AcademicAttendancePolicyEditor({
  name,
  defaultValue,
  theme = "dark",
}: {
  name: string;
  defaultValue?: unknown;
  theme?: EditorTheme;
}) {
  const buildInitial = useCallback(() => normalizeAttendanceConfiguration(defaultValue), [defaultValue]);
  const [configuration, setConfiguration] = useState<AttendanceConfiguration>(buildInitial);
  const containerRef = useRef<HTMLDivElement>(null);
  const styles = themeClasses[theme];
  const serialized = {
    ...configuration.extra,
    sessions: configuration.sessions,
    late_after: configuration.late_after,
  };
  const validation = validateAttendanceConfiguration(serialized);

  const resetConfiguration = useCallback(() => setConfiguration(buildInitial()), [buildInitial]);

  useEffect(resetConfiguration, [resetConfiguration]);
  useFormReset(containerRef, resetConfiguration);

  const toggleSession = (session: string) => {
    setConfiguration((current) => ({
      ...current,
      sessions: current.sessions.includes(session)
        ? current.sessions.filter((item) => item !== session)
        : [...current.sessions, session],
    }));
  };

  return (
    <div ref={containerRef} className={`rounded-xl border p-4 ${styles.panel}`}>
      <input type="hidden" name={name} value={JSON.stringify(serialized)} />
      <p className={`text-sm font-black ${styles.label}`}>Register schedule</p>
      <p className={`mt-1 text-xs font-semibold ${styles.muted}`}>Choose when registers are taken and the time after which arrival is marked late.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          ["morning", "Morning register"],
          ["afternoon", "Afternoon register"],
          ["evening", "Evening / boarding register"],
        ].map(([session, label]) => (
          <label key={session} className={`flex min-h-12 items-center gap-3 rounded-lg border px-3 text-sm font-bold ${styles.chip}`}>
            <input type="checkbox" checked={configuration.sessions.includes(session)} onChange={() => toggleSession(session)} />
            {label}
          </label>
        ))}
      </div>
      <label className={`mt-4 block max-w-xs text-sm font-bold ${styles.label}`}>
        Mark learners late after
        <input type="time" value={configuration.late_after} onChange={(event) => setConfiguration((current) => ({ ...current, late_after: event.target.value }))} className={`${baseInputClass} ${styles.input}`} required />
      </label>
      <p aria-live="polite" className={`mt-3 text-xs font-bold ${validation ? "text-amber-300" : theme === "dark" ? "text-emerald-300" : "text-emerald-700"}`}>
        {validation ?? "Attendance register schedule is complete."}
      </p>
    </div>
  );
}

export function AcademicReportCardPolicyEditor({
  name,
  defaultValue,
  theme = "dark",
}: {
  name: string;
  defaultValue?: unknown;
  theme?: EditorTheme;
}) {
  const buildInitial = useCallback(() => normalizeReportCardConfiguration(defaultValue), [defaultValue]);
  const [configuration, setConfiguration] = useState<ReportCardConfiguration>(buildInitial);
  const [customSignature, setCustomSignature] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const styles = themeClasses[theme];
  const serialized = {
    ...configuration.extra,
    class_teacher_comment: configuration.classTeacherComment,
    principal_comment: configuration.principalComment,
    signature_lines: configuration.signatureLines,
  };

  const resetConfiguration = useCallback(() => setConfiguration(buildInitial()), [buildInitial]);

  useEffect(resetConfiguration, [resetConfiguration]);
  useFormReset(containerRef, resetConfiguration);

  const toggleSignature = (signature: string) => {
    setConfiguration((current) => ({
      ...current,
      signatureLines: current.signatureLines.includes(signature)
        ? current.signatureLines.filter((item) => item !== signature)
        : [...current.signatureLines, signature],
    }));
  };

  const addCustomSignature = () => {
    const signature = customSignature.trim();
    if (!signature || configuration.signatureLines.includes(signature)) return;
    setConfiguration((current) => ({ ...current, signatureLines: [...current.signatureLines, signature] }));
    setCustomSignature("");
  };

  return (
    <div ref={containerRef} className={`rounded-xl border p-4 ${styles.panel}`}>
      <input type="hidden" name={name} value={JSON.stringify(serialized)} />
      <p className={`text-sm font-black ${styles.label}`}>Comments and approval lines</p>
      <p className={`mt-1 text-xs font-semibold ${styles.muted}`}>Choose what staff complete before a report card is approved and published.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className={`flex min-h-12 items-center gap-3 rounded-lg border px-3 text-sm font-bold ${styles.chip}`}>
          <input type="checkbox" checked={configuration.classTeacherComment} onChange={(event) => setConfiguration((current) => ({ ...current, classTeacherComment: event.target.checked }))} />
          Class teacher comment
        </label>
        <label className={`flex min-h-12 items-center gap-3 rounded-lg border px-3 text-sm font-bold ${styles.chip}`}>
          <input type="checkbox" checked={configuration.principalComment} onChange={(event) => setConfiguration((current) => ({ ...current, principalComment: event.target.checked }))} />
          Principal comment
        </label>
      </div>

      <p className={`mt-4 text-sm font-black ${styles.label}`}>Signature lines</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {["Class Teacher", "Principal", "Parent / Guardian", "Student"].map((signature) => (
          <label key={signature} className={`flex min-h-11 items-center gap-3 rounded-lg border px-3 text-sm font-bold ${styles.chip}`}>
            <input type="checkbox" checked={configuration.signatureLines.includes(signature)} onChange={() => toggleSignature(signature)} />
            {signature}
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input value={customSignature} onChange={(event) => setCustomSignature(event.target.value)} placeholder="Add another signature, e.g. Dean of Academics" className={`${baseInputClass} mt-0 ${styles.input}`} />
        <button type="button" onClick={addCustomSignature} disabled={!customSignature.trim()} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold disabled:opacity-40 ${styles.secondaryButton}`}>
          <Plus className="h-4 w-4" /> Add signature
        </button>
      </div>
      {configuration.signatureLines.filter((signature) => !["Class Teacher", "Principal", "Parent / Guardian", "Student"].includes(signature)).length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {configuration.signatureLines
            .filter((signature) => !["Class Teacher", "Principal", "Parent / Guardian", "Student"].includes(signature))
            .map((signature) => (
              <button key={signature} type="button" onClick={() => toggleSignature(signature)} className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-bold ${styles.chip}`}>
                {signature} <Trash2 className="h-3.5 w-3.5" />
              </button>
            ))}
        </div>
      ) : null}
      <button type="button" onClick={() => setConfiguration(buildInitial())} className={`mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold ${styles.secondaryButton}`}>
        <RotateCcw className="h-3.5 w-3.5" /> Reset choices
      </button>
    </div>
  );
}
