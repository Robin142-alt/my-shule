"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { CheckCircle2, Plus, RotateCcw, X } from "lucide-react";

export type AcademicCurriculumModel =
  | "CBC"
  | "CBE"
  | "8-4-4"
  | "International"
  | "Hybrid"
  | "Custom";

type EditorTheme = "dark" | "light";

type CurriculumItem = {
  id: string;
  label: string;
  kind: "string" | "object";
  labelKey: "name" | "label" | "code";
  extra: Record<string, unknown>;
};

type PromotionRules = {
  decisionMode: string;
  minimumAverage: string;
  minimumAttendance: string;
  maximumFailedSubjects: string;
  requireCoreSubjectPass: boolean;
  extra: Record<string, unknown>;
};

type CurriculumConfigurationState = {
  levels: CurriculumItem[];
  pathways: CurriculumItem[];
  tracks: CurriculumItem[];
  frameworks: CurriculumItem[];
  assessmentMode: string;
  promotion: PromotionRules;
  extra: Record<string, unknown>;
};

type CurriculumPreset = {
  levels: string[];
  pathways: string[];
  tracks: string[];
  frameworks: string[];
  assessmentMode: string;
  promotion: Omit<PromotionRules, "extra">;
};

const CURRICULUM_MODELS: AcademicCurriculumModel[] = [
  "CBC",
  "CBE",
  "8-4-4",
  "International",
  "Hybrid",
  "Custom",
];

const PRESETS: Record<AcademicCurriculumModel, CurriculumPreset> = {
  CBC: {
    levels: ["Pre-primary", "Primary", "Junior School", "Senior School"],
    pathways: ["STEM", "Social Sciences", "Arts and Sports Science"],
    tracks: [],
    frameworks: [],
    assessmentMode: "competency",
    promotion: {
      decisionMode: "teacher_review",
      minimumAverage: "",
      minimumAttendance: "75",
      maximumFailedSubjects: "",
      requireCoreSubjectPass: false,
    },
  },
  CBE: {
    levels: ["Pre-primary", "Primary", "Junior School", "Senior School"],
    pathways: ["STEM", "Social Sciences", "Arts and Sports Science"],
    tracks: [],
    frameworks: [],
    assessmentMode: "competency",
    promotion: {
      decisionMode: "teacher_review",
      minimumAverage: "",
      minimumAttendance: "75",
      maximumFailedSubjects: "",
      requireCoreSubjectPass: false,
    },
  },
  "8-4-4": {
    levels: ["Primary", "Secondary"],
    pathways: [],
    tracks: [],
    frameworks: ["KCPE", "KCSE"],
    assessmentMode: "marks",
    promotion: {
      decisionMode: "teacher_review",
      minimumAverage: "50",
      minimumAttendance: "75",
      maximumFailedSubjects: "3",
      requireCoreSubjectPass: false,
    },
  },
  International: {
    levels: ["Early Years", "Primary", "Lower Secondary", "Upper Secondary"],
    pathways: [],
    tracks: [],
    frameworks: [],
    assessmentMode: "mixed",
    promotion: {
      decisionMode: "teacher_review",
      minimumAverage: "",
      minimumAttendance: "75",
      maximumFailedSubjects: "",
      requireCoreSubjectPass: false,
    },
  },
  Hybrid: {
    levels: ["Primary", "Junior School", "Senior School"],
    pathways: [],
    tracks: [],
    frameworks: [],
    assessmentMode: "mixed",
    promotion: {
      decisionMode: "teacher_review",
      minimumAverage: "",
      minimumAttendance: "75",
      maximumFailedSubjects: "",
      requireCoreSubjectPass: false,
    },
  },
  Custom: {
    levels: [],
    pathways: [],
    tracks: [],
    frameworks: [],
    assessmentMode: "mixed",
    promotion: {
      decisionMode: "teacher_review",
      minimumAverage: "",
      minimumAttendance: "",
      maximumFailedSubjects: "",
      requireCoreSubjectPass: false,
    },
  },
};

const SUGGESTIONS: Record<
  AcademicCurriculumModel,
  { levels: string[]; pathways: string[]; tracks: string[]; frameworks: string[] }
> = {
  CBC: {
    levels: ["Pre-primary", "Primary", "Junior School", "Senior School"],
    pathways: ["STEM", "Social Sciences", "Arts and Sports Science"],
    tracks: ["Pure Sciences", "Applied Sciences", "Technical Studies", "Humanities", "Languages", "Arts", "Sports"],
    frameworks: ["KPSEA", "KJSEA"],
  },
  CBE: {
    levels: ["Pre-primary", "Primary", "Junior School", "Senior School"],
    pathways: ["STEM", "Social Sciences", "Arts and Sports Science"],
    tracks: ["Pure Sciences", "Applied Sciences", "Technical Studies", "Humanities", "Languages", "Arts", "Sports"],
    frameworks: ["KPSEA", "KJSEA"],
  },
  "8-4-4": {
    levels: ["Primary", "Secondary"],
    pathways: [],
    tracks: [],
    frameworks: ["KCPE", "KCSE"],
  },
  International: {
    levels: ["Early Years", "Primary", "Lower Secondary", "Upper Secondary"],
    pathways: [],
    tracks: ["Sciences", "Humanities", "Languages", "Creative Arts", "Technical"],
    frameworks: ["Cambridge", "IB", "Pearson Edexcel"],
  },
  Hybrid: {
    levels: ["Pre-primary", "Primary", "Junior School", "Senior School", "Secondary"],
    pathways: ["STEM", "Social Sciences", "Arts and Sports Science"],
    tracks: ["Sciences", "Humanities", "Languages", "Technical", "Creative Arts", "Sports"],
    frameworks: ["KPSEA", "KJSEA", "KCSE", "Cambridge", "IB", "Pearson Edexcel"],
  },
  Custom: {
    levels: ["Early Years", "Primary", "Junior School", "Secondary", "Senior School"],
    pathways: ["STEM", "Humanities", "Languages", "Technical", "Creative Arts", "Sports"],
    tracks: [],
    frameworks: [],
  },
};

const themeClasses = {
  dark: {
    label: "text-white",
    muted: "text-white/60",
    input: "border-white/15 bg-[#0D2A5B] text-white placeholder:text-white/35 focus:border-cyan-300",
    panel: "border-white/10 bg-white/[0.04]",
    section: "border-white/10 bg-white/[0.035]",
    chip: "border-white/15 bg-white/5 text-white",
    selectedChip: "border-cyan-300/60 bg-cyan-300/15 text-cyan-100",
    secondaryButton: "border-white/15 bg-white/5 text-white hover:bg-white/10",
    success: "text-emerald-300",
    warning: "text-amber-300",
  },
  light: {
    label: "text-slate-800",
    muted: "text-slate-500",
    input: "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500",
    panel: "border-slate-200 bg-slate-50",
    section: "border-slate-200 bg-white",
    chip: "border-slate-300 bg-white text-slate-700",
    selectedChip: "border-blue-300 bg-blue-50 text-blue-800",
    secondaryButton: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    success: "text-emerald-700",
    warning: "text-amber-700",
  },
} as const;

const baseInputClass =
  "mt-1 min-h-10 w-full rounded-lg border px-3 py-2 text-sm font-semibold outline-none transition";

let curriculumItemSequence = 0;

function nextItemId() {
  curriculumItemSequence += 1;
  return `curriculum-item-${curriculumItemSequence}`;
}

function textValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" ? value : "";
}

function itemState(value: unknown): CurriculumItem | null {
  if (typeof value === "string") {
    const label = value.trim();
    return label
      ? { id: nextItemId(), label, kind: "string", labelKey: "name", extra: {} }
      : null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const labelKey = typeof record.name === "string"
    ? "name"
    : typeof record.label === "string"
      ? "label"
      : "code";
  const label = String(record[labelKey] ?? "").trim();
  if (!label) return null;
  const extra = { ...record };
  delete extra[labelKey];
  return { id: nextItemId(), label, kind: "object", labelKey, extra };
}

function itemsFrom(input: unknown) {
  return Array.isArray(input)
    ? input.map(itemState).filter((item): item is CurriculumItem => item !== null)
    : [];
}

function itemsFromLabels(labels: string[]) {
  return labels.map((label) => itemState(label)).filter((item): item is CurriculumItem => item !== null);
}

function serializeItems(items: CurriculumItem[]) {
  return items.map((item) => item.kind === "object"
    ? { ...item.extra, [item.labelKey]: item.label.trim() }
    : item.label.trim());
}

function normalizeModel(input: unknown): AcademicCurriculumModel | "" {
  const value = String(input ?? "");
  return CURRICULUM_MODELS.includes(value as AcademicCurriculumModel)
    ? value as AcademicCurriculumModel
    : "";
}

function normalizePromotionRules(input: unknown): PromotionRules {
  const value = input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};
  const {
    decision_mode: _decisionMode,
    minimum_average: _minimumAverage,
    minimum_attendance: _minimumAttendance,
    max_failed_subjects: _maximumFailedSubjects,
    require_core_subject_pass: _requireCoreSubjectPass,
    ...extra
  } = value;
  return {
    decisionMode: typeof value.decision_mode === "string" ? value.decision_mode : "teacher_review",
    minimumAverage: textValue(value.minimum_average),
    minimumAttendance: textValue(value.minimum_attendance),
    maximumFailedSubjects: textValue(value.max_failed_subjects),
    requireCoreSubjectPass: value.require_core_subject_pass === true,
    extra,
  };
}

function normalizeConfiguration(input: unknown): CurriculumConfigurationState {
  const value = input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {};
  const {
    levels: _levels,
    pathways: _pathways,
    tracks: _tracks,
    frameworks: _frameworks,
    assessment_mode: _assessmentMode,
    promotion_rules: _promotionRules,
    ...extra
  } = value;
  return {
    levels: itemsFrom(value.levels),
    pathways: itemsFrom(value.pathways),
    tracks: itemsFrom(value.tracks),
    frameworks: itemsFrom(value.frameworks),
    assessmentMode: typeof value.assessment_mode === "string" ? value.assessment_mode : "mixed",
    promotion: normalizePromotionRules(value.promotion_rules),
    extra,
  };
}

function configurationFromPreset(
  model: AcademicCurriculumModel,
  previous?: CurriculumConfigurationState,
): CurriculumConfigurationState {
  const preset = PRESETS[model];
  return {
    levels: itemsFromLabels(preset.levels),
    pathways: itemsFromLabels(preset.pathways),
    tracks: itemsFromLabels(preset.tracks),
    frameworks: itemsFromLabels(preset.frameworks),
    assessmentMode: preset.assessmentMode,
    promotion: {
      ...preset.promotion,
      extra: previous?.promotion.extra ?? {},
    },
    extra: previous?.extra ?? {},
  };
}

function serializeConfiguration(configuration: CurriculumConfigurationState) {
  const optionalNumber = (input: string) => input.trim() === "" ? null : Number(input);
  return {
    ...configuration.extra,
    levels: serializeItems(configuration.levels),
    pathways: serializeItems(configuration.pathways),
    tracks: serializeItems(configuration.tracks),
    frameworks: serializeItems(configuration.frameworks),
    assessment_mode: configuration.assessmentMode,
    promotion_rules: {
      ...configuration.promotion.extra,
      decision_mode: configuration.promotion.decisionMode,
      minimum_average: optionalNumber(configuration.promotion.minimumAverage),
      minimum_attendance: optionalNumber(configuration.promotion.minimumAttendance),
      max_failed_subjects: optionalNumber(configuration.promotion.maximumFailedSubjects),
      require_core_subject_pass: configuration.promotion.requireCoreSubjectPass,
    },
  };
}

function meaningfulValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return value !== null && value !== undefined && value !== "";
}

export function validateAcademicCurriculumConfiguration(
  modelInput: unknown,
  configurationInput: unknown,
): string | null {
  const model = normalizeModel(modelInput);
  if (!model) return "Choose the curriculum model used by this school.";
  if (!configurationInput || typeof configurationInput !== "object" || Array.isArray(configurationInput)) {
    return "Curriculum structure could not be read.";
  }
  const configuration = configurationInput as Record<string, unknown>;
  const collections = ["levels", "pathways", "tracks", "frameworks"] as const;
  for (const key of collections) {
    const items = configuration[key];
    if (!Array.isArray(items)) return `${key[0].toUpperCase()}${key.slice(1)} must be a list.`;
    const labels = items.map((item) => {
      if (typeof item === "string") return item.trim();
      if (!item || typeof item !== "object" || Array.isArray(item)) return "";
      const record = item as Record<string, unknown>;
      return String(record.name ?? record.label ?? record.code ?? "").trim();
    });
    if (labels.some((label) => !label)) return `Every ${key.slice(0, -1)} needs a name.`;
    if (new Set(labels.map((label) => label.toLowerCase())).size !== labels.length) {
      return `${key[0].toUpperCase()}${key.slice(1)} contain a duplicate name.`;
    }
  }

  const knownStructuralKeys = new Set([
    "levels",
    "pathways",
    "tracks",
    "frameworks",
    "assessment_mode",
    "promotion_rules",
  ]);
  const hasSelectedStructure = collections.some((key) => (configuration[key] as unknown[]).length > 0);
  const hasLegacyStructure = Object.entries(configuration)
    .some(([key, value]) => !knownStructuralKeys.has(key) && meaningfulValue(value));
  if (!hasSelectedStructure && !hasLegacyStructure) {
    return "Add at least one school level, pathway, track, or curriculum framework.";
  }

  const promotion = configuration.promotion_rules;
  if (!promotion || typeof promotion !== "object" || Array.isArray(promotion)) {
    return "Promotion rules could not be read.";
  }
  const promotionRecord = promotion as Record<string, unknown>;
  for (const [key, label] of [
    ["minimum_average", "Minimum average"],
    ["minimum_attendance", "Minimum attendance"],
  ] as const) {
    const input = promotionRecord[key];
    if (input === null || input === undefined || input === "") continue;
    const number = Number(input);
    if (!Number.isFinite(number) || number < 0 || number > 100) {
      return `${label} must be between 0 and 100.`;
    }
  }
  const failedSubjects = promotionRecord.max_failed_subjects;
  if (failedSubjects !== null && failedSubjects !== undefined && failedSubjects !== "") {
    const number = Number(failedSubjects);
    if (!Number.isInteger(number) || number < 0) {
      return "Maximum failed subjects must be a whole number of zero or more.";
    }
  }
  return null;
}

function useFormReset(containerRef: RefObject<HTMLDivElement | null>, reset: () => void) {
  useEffect(() => {
    const form = containerRef.current?.closest("form");
    if (!form) return;
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [containerRef, reset]);
}

function CurriculumCollectionEditor({
  title,
  description,
  emptyMessage,
  items,
  suggestions,
  theme,
  onChange,
}: {
  title: string;
  description: string;
  emptyMessage: string;
  items: CurriculumItem[];
  suggestions: string[];
  theme: EditorTheme;
  onChange: (items: CurriculumItem[]) => void;
}) {
  const [customValue, setCustomValue] = useState("");
  const styles = themeClasses[theme];
  const selectedLabels = new Set(items.map((item) => item.label.toLowerCase()));

  const add = (labelInput: string) => {
    const label = labelInput.trim();
    if (!label || selectedLabels.has(label.toLowerCase())) return;
    const item = itemState(label);
    if (!item) return;
    onChange([...items, item]);
    setCustomValue("");
  };

  return (
    <section className={`rounded-xl border p-3 sm:p-4 ${styles.section}`}>
      <h4 className={`text-sm font-black ${styles.label}`}>{title}</h4>
      <p className={`mt-1 text-xs font-semibold ${styles.muted}`}>{description}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {items.length === 0 ? (
          <p className={`text-xs font-semibold ${styles.muted}`}>{emptyMessage}</p>
        ) : items.map((item) => (
          <span key={item.id} className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-bold ${styles.selectedChip}`}>
            {item.label}
            <button
              type="button"
              aria-label={`Remove ${item.label}`}
              onClick={() => onChange(items.filter((candidate) => candidate.id !== item.id))}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>

      {suggestions.some((suggestion) => !selectedLabels.has(suggestion.toLowerCase())) ? (
        <div className="mt-3">
          <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${styles.muted}`}>Suggested options</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions
              .filter((suggestion) => !selectedLabels.has(suggestion.toLowerCase()))
              .map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => add(suggestion)}
                  className={`inline-flex min-h-8 items-center gap-1 rounded-full border px-3 text-xs font-bold ${styles.chip}`}
                >
                  <Plus className="h-3 w-3" /> {suggestion}
                </button>
              ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={customValue}
          onChange={(event) => setCustomValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            add(customValue);
          }}
          aria-label={`Add custom ${title.toLowerCase()}`}
          placeholder={`Add another ${title.toLowerCase()}`}
          className={`${baseInputClass} mt-0 flex-1 ${styles.input}`}
        />
        <button
          type="button"
          onClick={() => add(customValue)}
          disabled={!customValue.trim()}
          className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold disabled:opacity-40 ${styles.secondaryButton}`}
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
    </section>
  );
}

export function AcademicCurriculumConfigurationEditor({
  configurationName,
  modelName = "curriculum_model",
  defaultConfiguration,
  defaultModel,
  theme = "dark",
}: {
  configurationName: string;
  modelName?: string;
  defaultConfiguration?: unknown;
  defaultModel?: unknown;
  theme?: EditorTheme;
}) {
  const buildInitialModel = useCallback(() => normalizeModel(defaultModel), [defaultModel]);
  const buildInitialConfiguration = useCallback(
    () => normalizeConfiguration(defaultConfiguration),
    [defaultConfiguration],
  );
  const [model, setModel] = useState<AcademicCurriculumModel | "">(buildInitialModel);
  const [configuration, setConfiguration] = useState<CurriculumConfigurationState>(buildInitialConfiguration);
  const containerRef = useRef<HTMLDivElement>(null);
  const styles = themeClasses[theme];
  const suggestions = model ? SUGGESTIONS[model] : SUGGESTIONS.Custom;
  const serialized = useMemo(() => serializeConfiguration(configuration), [configuration]);
  const validation = validateAcademicCurriculumConfiguration(model, serialized);

  const reset = useCallback(() => {
    setModel(buildInitialModel());
    setConfiguration(buildInitialConfiguration());
  }, [buildInitialConfiguration, buildInitialModel]);

  useEffect(reset, [reset]);
  useFormReset(containerRef, reset);

  const updateCollection = (
    key: "levels" | "pathways" | "tracks" | "frameworks",
    items: CurriculumItem[],
  ) => setConfiguration((current) => ({ ...current, [key]: items }));

  const chooseModel = (nextModel: AcademicCurriculumModel | "") => {
    setModel(nextModel);
    if (!nextModel) return;
    const hasStructuredSelections = [
      configuration.levels,
      configuration.pathways,
      configuration.tracks,
      configuration.frameworks,
    ].some((items) => items.length > 0);
    if (!hasStructuredSelections && Object.keys(configuration.extra).length === 0) {
      setConfiguration(configurationFromPreset(nextModel, configuration));
    }
  };

  const applyStarter = () => {
    if (!model) return;
    setConfiguration((current) => configurationFromPreset(model, current));
  };

  const updatePromotion = (change: Partial<PromotionRules>) => {
    setConfiguration((current) => ({
      ...current,
      promotion: { ...current.promotion, ...change },
    }));
  };

  const selectedCount = configuration.levels.length
    + configuration.pathways.length
    + configuration.tracks.length
    + configuration.frameworks.length;

  return (
    <div ref={containerRef} className={`rounded-xl border p-3 sm:p-4 ${styles.panel}`}>
      <input type="hidden" name={modelName} value={model} />
      <input type="hidden" name={configurationName} value={JSON.stringify(serialized)} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <label className={`block flex-1 text-sm font-black ${styles.label}`}>
          Curriculum model
          <select
            aria-label="Curriculum model"
            value={model}
            onChange={(event) => chooseModel(event.target.value as AcademicCurriculumModel | "")}
            className={`${baseInputClass} ${styles.input}`}
            required
          >
            <option value="">Choose the school curriculum</option>
            {CURRICULUM_MODELS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <span className={`mt-1 block text-xs font-semibold ${styles.muted}`}>
            Choose the model first, then keep only the levels and programmes this school actually offers.
          </span>
        </label>
        <button
          type="button"
          onClick={applyStarter}
          disabled={!model}
          className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold disabled:opacity-40 ${styles.secondaryButton}`}
        >
          <RotateCcw className="h-4 w-4" /> Load {model || "model"} starter
        </button>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <CurriculumCollectionEditor
          title="School levels and stages"
          description="Select the education levels learners can be admitted into."
          emptyMessage="No school level selected yet."
          items={configuration.levels}
          suggestions={suggestions.levels}
          theme={theme}
          onChange={(items) => updateCollection("levels", items)}
        />
        <CurriculumCollectionEditor
          title="Pathways and programmes"
          description="Add senior-school pathways or other programmes offered by the school."
          emptyMessage="No pathway is required unless the school offers one."
          items={configuration.pathways}
          suggestions={suggestions.pathways}
          theme={theme}
          onChange={(items) => updateCollection("pathways", items)}
        />
        <CurriculumCollectionEditor
          title="Tracks and specialisations"
          description="Add the tracks or specialisations learners may choose."
          emptyMessage="No track has been selected."
          items={configuration.tracks}
          suggestions={suggestions.tracks}
          theme={theme}
          onChange={(items) => updateCollection("tracks", items)}
        />
        <CurriculumCollectionEditor
          title="Curriculum and exam frameworks"
          description="Add national examinations, international boards, or school frameworks in use."
          emptyMessage="No curriculum or exam framework has been selected."
          items={configuration.frameworks}
          suggestions={suggestions.frameworks}
          theme={theme}
          onChange={(items) => updateCollection("frameworks", items)}
        />
      </div>

      <section className={`mt-3 rounded-xl border p-3 sm:p-4 ${styles.section}`}>
        <h4 className={`text-sm font-black ${styles.label}`}>Assessment and learner promotion</h4>
        <p className={`mt-1 text-xs font-semibold ${styles.muted}`}>
          Record the school-wide defaults. Exams and report-card policies can add more detailed rules later.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <label className={`text-xs font-bold ${styles.label}`}>
            Assessment approach
            <select
              value={configuration.assessmentMode}
              onChange={(event) => setConfiguration((current) => ({ ...current, assessmentMode: event.target.value }))}
              className={`${baseInputClass} ${styles.input}`}
            >
              <option value="competency">Competency based</option>
              <option value="marks">Marks and grades</option>
              <option value="mixed">Mixed approach</option>
              <option value="continuous_assessment">Continuous assessment</option>
            </select>
          </label>
          <label className={`text-xs font-bold ${styles.label}`}>
            Promotion decision
            <select
              value={configuration.promotion.decisionMode}
              onChange={(event) => updatePromotion({ decisionMode: event.target.value })}
              className={`${baseInputClass} ${styles.input}`}
            >
              <option value="teacher_review">Teacher or academic review</option>
              <option value="automatic">Automatic when rules pass</option>
              <option value="principal_approval">Principal approval</option>
              <option value="custom">School-defined review</option>
            </select>
          </label>
          <label className={`text-xs font-bold ${styles.label}`}>
            Minimum average (%)
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={configuration.promotion.minimumAverage}
              onChange={(event) => updatePromotion({ minimumAverage: event.target.value })}
              placeholder="Optional"
              className={`${baseInputClass} ${styles.input}`}
            />
          </label>
          <label className={`text-xs font-bold ${styles.label}`}>
            Minimum attendance (%)
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={configuration.promotion.minimumAttendance}
              onChange={(event) => updatePromotion({ minimumAttendance: event.target.value })}
              placeholder="Optional"
              className={`${baseInputClass} ${styles.input}`}
            />
          </label>
          <label className={`text-xs font-bold ${styles.label}`}>
            Maximum failed subjects
            <input
              type="number"
              min="0"
              step="1"
              value={configuration.promotion.maximumFailedSubjects}
              onChange={(event) => updatePromotion({ maximumFailedSubjects: event.target.value })}
              placeholder="Optional"
              className={`${baseInputClass} ${styles.input}`}
            />
          </label>
          <label className={`flex min-h-12 items-center gap-3 self-end rounded-lg border px-3 text-xs font-bold ${styles.chip}`}>
            <input
              type="checkbox"
              checked={configuration.promotion.requireCoreSubjectPass}
              onChange={(event) => updatePromotion({ requireCoreSubjectPass: event.target.checked })}
            />
            Require core-subject pass
          </label>
        </div>
      </section>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className={`inline-flex items-center gap-2 text-xs font-bold ${validation ? styles.warning : styles.success}`} aria-live="polite">
          {validation ? null : <CheckCircle2 className="h-4 w-4" />}
          {validation ?? `${model} structure is ready with ${selectedCount} configured options.`}
        </p>
        <p className={`text-xs font-semibold ${styles.muted}`}>
          Saved as structured school data; staff never need to edit JSON.
        </p>
      </div>
    </div>
  );
}
