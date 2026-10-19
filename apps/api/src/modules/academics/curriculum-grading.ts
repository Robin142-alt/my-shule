import { BadRequestException } from '@nestjs/common';

export function normalizeCurriculum(value: unknown): string {
  const name = String(value ?? '').trim();
  if (!name || name.length > 100 || ['__proto__', 'constructor', 'prototype'].includes(name.toLowerCase())) {
    throw new BadRequestException('Choose a curriculum or enter a curriculum name of up to 100 characters.');
  }
  const key = name.toLowerCase().replace(/[_\s-]/g, '');
  if (key === '844') return '8-4-4';
  if (key === 'cbc' || key === 'cbe') return key.toUpperCase();
  return name;
}

export function normalizeCurricula(value: unknown, fallback?: unknown): string[] {
  if (value !== undefined && !Array.isArray(value)) {
    throw new BadRequestException('Choose one or more curricula for this grading policy.');
  }
  const candidates = Array.isArray(value) ? value : fallback === undefined ? [] : [fallback];
  if (!candidates.length || candidates.length > 10) {
    throw new BadRequestException('Choose between one and ten curricula for this grading policy.');
  }
  const normalized = candidates.map(normalizeCurriculum);
  const unique = new Map(normalized.map((curriculum) => [
    curriculum.toLowerCase().replace(/[_\s-]/g, ''),
    curriculum,
  ]));
  return [...unique.values()];
}

/**
 * Older grading systems predate curriculum_model. Infer only unmistakable
 * Kenyan grade-band formats so an explicitly selected legacy policy can still
 * be used safely without treating CBC competency bands as 8-4-4 grades.
 */
export function inferLegacyGradingCurriculum(curriculum: unknown, rulesValue: unknown): string | null {
  const key = String(curriculum ?? '').trim().toLowerCase().replace(/[_\s-]/g, '');
  if (!Array.isArray(rulesValue) || rulesValue.length === 0) return null;
  const labels = rulesValue.map((rule) => {
    if (!rule || typeof rule !== 'object' || Array.isArray(rule)) return '';
    return String((rule as Record<string, unknown>).label ?? '').trim().toUpperCase().replace(/\s+/g, '');
  });
  if (labels.some((label) => !label)) return null;
  if (labels.every((label) => /^[A-E][+-]?$/.test(label))) return '8-4-4';
  if (labels.every((label) => /^(EE|ME|AE|BE)[12]?$/.test(label))) {
    return key === 'cbe' ? 'CBE' : 'CBC';
  }
  return null;
}

export function validateGradingRules(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value) || !value.length || value.length > 100) {
    throw new BadRequestException('Add between 1 and 100 grade bands.');
  }
  const labels = new Set<string>();
  const bands = value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new BadRequestException('Every grade band must contain a label and mark range.');
    }
    const label = String(item.label ?? '').trim();
    const min = Number(item.min ?? item.min_score);
    const max = Number(item.max ?? item.max_score);
    const points = item.points == null || item.points === '' ? null : Number(item.points);
    if (!label || labels.has(label.toLowerCase()) || !Number.isInteger(min) || !Number.isInteger(max)
      || min < 0 || max > 100 || min > max || (points !== null && (!Number.isFinite(points) || points < 0))) {
      throw new BadRequestException('Use unique grade labels, whole-number ranges from 0 to 100, and non-negative points.');
    }
    labels.add(label.toLowerCase());
    return { ...item, label, min, max, points };
  });
  const ordered = [...bands].sort((a, b) => a.min - b.min);
  if (ordered[0].min !== 0 || ordered.at(-1)!.max !== 100
    || ordered.some((band, index) => index > 0 && band.min !== ordered[index - 1].max + 1)) {
    throw new BadRequestException('Grade bands must cover every mark from 0 to 100 without gaps or overlaps.');
  }
  return bands;
}

/** Preserve legacy bands and keep each curriculum's saved scale independent. */
export function gradingRulesForCurriculum(system: Record<string, any>, curriculum: string): unknown[] | null {
  const key = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[_\s-]/g, '');
  const configured = system.rules_by_curriculum;
  if (configured && typeof configured === 'object' && !Array.isArray(configured)) {
    const entry = Object.entries(configured).find(([name]) => key(name) === key(curriculum));
    if (entry) return Array.isArray(entry[1]) ? entry[1] : null;
  }
  const inferred = inferLegacyGradingCurriculum(curriculum, system.rules);
  const declared = inferred || system.curriculum_model;
  return key(declared) === key(curriculum) && Array.isArray(system.rules) ? system.rules : null;
}

export function prepareCurriculumGrading(
  curricula: string[], input: { rules?: unknown; rules_by_curriculum?: unknown }, previous: Record<string, any> = {},
): { rules: unknown; rules_by_curriculum: Record<string, unknown> } {
  const stored: Record<string, unknown> = { ...(previous.rules_by_curriculum ?? {}) };
  const legacyCurriculum = inferLegacyGradingCurriculum(previous.curriculum_model, previous.rules) || previous.curriculum_model;
  if (legacyCurriculum && Array.isArray(previous.rules) && previous.rules.length && !stored[legacyCurriculum]) {
    stored[legacyCurriculum] = previous.rules;
  }
  if (input.rules_by_curriculum !== undefined) {
    if (!curricula.length) throw new BadRequestException('Choose at least one curriculum before saving grade bands.');
    if (!input.rules_by_curriculum || typeof input.rules_by_curriculum !== 'object' || Array.isArray(input.rules_by_curriculum)
      || Object.keys(input.rules_by_curriculum).length > 10) {
      throw new BadRequestException('Provide grade bands for each selected curriculum.');
    }
    const supplied = Object.fromEntries(Object.entries(input.rules_by_curriculum).map(([name, bands]) => [normalizeCurriculum(name), bands]));
    for (const curriculum of curricula) {
      const bands = supplied[curriculum] ?? stored[curriculum];
      if (!bands) throw new BadRequestException(`${curriculum}: add grade bands before saving this policy.`);
      stored[curriculum] = validateGradingRules(bands);
    }
    return { rules: stored[curricula[0]], rules_by_curriculum: stored };
  }
  // Compatibility for older clients: never replace another curriculum's saved scale.
  if (input.rules !== undefined) {
    const bands = validateGradingRules(input.rules);
    const target = inferLegacyGradingCurriculum(curricula[0], bands) || curricula[0];
    if (target) stored[target] = bands;
    return { rules: bands, rules_by_curriculum: stored };
  }
  return { rules: previous.rules ?? [], rules_by_curriculum: stored };
}

/** Expressions are static SQL from repository code, never request values.
 * The newest applicable school policy is selected independently for each class curriculum.
 */
export function academicCurriculumGradingSql(tenant: string, curriculum: string, asOf = 'CURRENT_DATE'): string {
  return `SELECT system.*,
      CASE WHEN upper(system.curriculum_model) IN ('CBC', 'CBE') THEN 'competency' ELSE 'traditional' END AS reporting_mode
    FROM academics_grading_systems system
    WHERE system.tenant_id = ${tenant}
      AND lower(system.curriculum_model) = lower(${curriculum})
      AND system.is_active = TRUE AND system.archived_at IS NULL
      AND (system.effective_from IS NULL OR system.effective_from <= ${asOf})
      AND (system.effective_to IS NULL OR system.effective_to >= ${asOf})
    ORDER BY system.updated_at DESC, system.version DESC, system.id DESC LIMIT 1`;
}
