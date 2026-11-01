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
  const selected = Array.isArray(system.curriculum_models) && system.curriculum_models.length
    ? system.curriculum_models : system.curriculum_model ? [system.curriculum_model] : [];
  if (selected.length && !selected.some((name: unknown) => key(name) === key(curriculum))) return null;
  const configured = system.rules_by_curriculum;
  if (configured && typeof configured === 'object' && !Array.isArray(configured)) {
    const entry = Object.entries(configured).find(([name]) => key(name) === key(curriculum));
    if (entry) return Array.isArray(entry[1]) ? entry[1] : null;
  }
  const inferred = inferLegacyGradingCurriculum(curriculum, system.rules);
  const sharedLegacy = Array.isArray(system.curriculum_models) && system.curriculum_models.length > 1;
  const declared = sharedLegacy ? inferred : system.curriculum_model || inferred;
  return key(declared) === key(curriculum) && Array.isArray(system.rules) ? system.rules : null;
}

export function prepareCurriculumGrading(
  curricula: string[], input: { rules?: unknown; rules_by_curriculum?: unknown }, previous: Record<string, any> = {},
): { rules: unknown; rules_by_curriculum: Record<string, unknown> } {
  const stored: Record<string, unknown> = { ...(previous.rules_by_curriculum ?? {}) };
  const inferred = inferLegacyGradingCurriculum(previous.curriculum_model, previous.rules);
  const legacyCurriculum = Array.isArray(previous.curriculum_models) && previous.curriculum_models.length > 1
    ? inferred : previous.curriculum_model || inferred;
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
    const target = curricula.length === 1 ? curricula[0] : inferLegacyGradingCurriculum(curricula.find(c => ['CBC', 'CBE'].includes(c)), bands);
    if (!target) throw new BadRequestException('Provide grade bands separately for each selected curriculum.');
    if (!curricula.includes(target)) throw new BadRequestException(`Grade bands for ${target} do not match the selected curricula.`);
    stored[target] = bands;
    for (const curriculum of curricula) {
      if (!stored[curriculum]) throw new BadRequestException(`${curriculum}: add grade bands before saving this policy.`);
      stored[curriculum] = validateGradingRules(stored[curriculum]);
    }
    return { rules: stored[curricula[0]], rules_by_curriculum: stored };
  }
  if (curricula.length > 1 && (!previous.id || ('curriculum_models' in input || 'curriculum_model' in input))) {
    for (const name of curricula) {
      if (!Array.isArray(stored[name]) || !(stored[name] as unknown[]).length) throw new BadRequestException(`${name}: add grade bands before saving this policy.`);
    }
  }
  return { rules: previous.rules ?? [], rules_by_curriculum: stored };
}

export function missingCurriculumBands(system: Record<string, any>, curriculum: string): string | null {
  const selected = system.curriculum_models?.length ? system.curriculum_models : [system.curriculum_model];
  const key = (value: unknown) => String(value ?? '').toLowerCase().replace(/[_\s-]/g, '');
  if (selected.some((value: unknown) => key(value) === key(curriculum)) && !gradingRulesForCurriculum(system, curriculum)?.length) {
    return `Grading policy "${system.name}" enables ${curriculum} but has no saved grade bands for ${curriculum}. Open Academic Setup, enter and save its ${curriculum} grade bands before generating report cards.`;
  }
  return null;
}

/** Repository-owned SQL expressions only; curriculum keys have the same normalization as the editor. */
export function curriculumKeySql(value: string): string {
  return `regexp_replace(lower(btrim(COALESCE(${value},''))), '[-_[:space:]]', '', 'g')`;
}

export function academicRulesSql(system: string, curriculum: string): string {
  const key = curriculumKeySql(curriculum);
  const declared = curriculumKeySql(`to_jsonb(${system})->>'curriculum_model'`);
  const selected = `CASE WHEN jsonb_typeof(to_jsonb(${system})->'curriculum_models')='array' THEN to_jsonb(${system})->'curriculum_models' ELSE '[]'::jsonb END`;
  const legacy = `CASE WHEN jsonb_typeof(${system}.rules)='array' THEN ${system}.rules ELSE '[]'::jsonb END`;
  const supported = `(${declared}=${key} OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(${selected}) selected(value) WHERE ${curriculumKeySql('selected.value')}=${key}))`;
  return `CASE WHEN (jsonb_array_length(${selected})=0 AND ${declared}='') OR ${supported} THEN
    CASE WHEN EXISTS (SELECT 1 FROM jsonb_each(COALESCE(to_jsonb(${system})->'rules_by_curriculum','{}'::jsonb)) band WHERE ${curriculumKeySql('band.key')}=${key})
      THEN (SELECT value FROM jsonb_each(COALESCE(to_jsonb(${system})->'rules_by_curriculum','{}'::jsonb)) band WHERE ${curriculumKeySql('band.key')}=${key} LIMIT 1)
      WHEN jsonb_array_length(${selected})<=1 AND ${declared}=${key} THEN ${legacy}
      WHEN jsonb_array_length(${legacy})>0 AND (
        ${key}='844' AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(${legacy}) band WHERE COALESCE(upper(band->>'label'),'') !~ '^[A-E][+-]?$')
        OR ${key} IN ('cbc','cbe') AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(${legacy}) band WHERE COALESCE(upper(band->>'label'),'') !~ '^(EE|ME|AE|BE)[12]?$')) THEN ${legacy}
    END END`;
}

/** A selected policy family takes precedence; a missing scale must not borrow another year's policy. */
export function academicCurriculumGradingSql(tenant: string, curriculum: string, asOf = 'CURRENT_DATE', preferred = 'NULL'): string {
  return `WITH RECURSIVE preferred_family AS (
      SELECT (${preferred})::text AS id, ARRAY[(${preferred})::text] AS visited
      UNION ALL SELECT child.id::text,family.visited||child.id::text FROM academics_grading_systems child
        JOIN preferred_family family ON to_jsonb(child)->>'based_on_id'=family.id
        WHERE child.tenant_id=${tenant} AND NOT child.id::text=ANY(family.visited)
    ) SELECT system.id,system.name,system.version,${academicRulesSql('system', curriculum)} AS rules,
      CASE WHEN upper(${curriculum}) IN ('CBC','CBE') THEN 'competency' ELSE 'traditional' END AS reporting_mode
    FROM academics_grading_systems system
    WHERE system.tenant_id=${tenant} AND system.is_active=TRUE AND to_jsonb(system)->>'archived_at' IS NULL
      AND (system.effective_from IS NULL OR system.effective_from<=${asOf})
      AND (system.effective_to IS NULL OR system.effective_to>=${asOf})
      AND (${academicRulesSql('system', curriculum)} IS NOT NULL
        OR ${curriculumKeySql("to_jsonb(system)->>'curriculum_model'")}=${curriculumKeySql(curriculum)}
        OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(to_jsonb(system)->'curriculum_models','[]'::jsonb)) selected(value)
          WHERE ${curriculumKeySql('selected.value')}=${curriculumKeySql(curriculum)}))
    ORDER BY (system.id::text IN (SELECT id FROM preferred_family)) DESC,system.updated_at DESC,system.version DESC,system.id DESC LIMIT 1`;
}
