import { BadRequestException } from '@nestjs/common';

export function normalizeCurriculum(value: unknown): string {
  const name = String(value ?? '').trim();
  if (!name || name.length > 100) {
    throw new BadRequestException('Choose a curriculum or enter a curriculum name of up to 100 characters.');
  }
  const key = name.toLowerCase().replace(/[_\s-]/g, '');
  if (key === '844') return '8-4-4';
  if (key === 'cbc' || key === 'cbe') return key.toUpperCase();
  return name;
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
