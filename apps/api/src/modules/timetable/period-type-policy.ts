import { BadRequestException } from '@nestjs/common';
import type { TimetablePeriodTypeDto } from './dto/timetable.dto';

/** Definitions belong to the existing tenant/term configuration, not to a global catalogue. */
export function validatePeriodTypes(types: TimetablePeriodTypeDto[]): TimetablePeriodTypeDto[] {
  if (!types.length || types.length > 100) throw new BadRequestException('Configure between one and 100 period types');
  const ids = new Set<string>();
  const names = new Set<string>();
  return types.map((type) => {
    const id = type.id.trim();
    const name = type.name.trim();
    if (!id || id.length > 80 || !name || name.length > 100 || ids.has(id) || names.has(name.toLowerCase())) {
      throw new BadRequestException('Period types need unique names and identifiers');
    }
    if (!Number.isInteger(type.default_duration_minutes) || type.default_duration_minutes < 1 || type.default_duration_minutes > 360 || typeof type.is_teaching !== 'boolean') {
      throw new BadRequestException('Period types need a duration of 1–360 minutes and a teaching status');
    }
    ids.add(id);
    names.add(name.toLowerCase());
    return { id, name, default_duration_minutes: type.default_duration_minutes, is_teaching: type.is_teaching };
  });
}

export function validateConfigurationDays(days: Array<{
  day_of_week: number;
  periods: Array<{ id: string; starts_at: string; ends_at: string; period_type: string; is_teaching: boolean }>;
}>, types?: TimetablePeriodTypeDto[]): void {
  const dayIds = new Set<number>();
  const periodIds = new Set<string>();
  const clock = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!days.length || days.length > 7) throw new BadRequestException('Configure between one and seven school days');
  for (const day of days) {
    if (!Number.isInteger(day.day_of_week) || day.day_of_week < 1 || day.day_of_week > 7 || dayIds.has(day.day_of_week)) {
      throw new BadRequestException('Each school day must be unique');
    }
    dayIds.add(day.day_of_week);
    if (day.periods.length > 40) throw new BadRequestException('A day supports at most 40 periods');
    let end = '';
    for (const period of day.periods) {
      if (periodIds.has(period.id)) throw new BadRequestException('Each period occurrence must have its own identifier');
      periodIds.add(period.id);
      if (!clock.test(period.starts_at) || !clock.test(period.ends_at) || period.starts_at >= period.ends_at || period.starts_at < end) {
        throw new BadRequestException('Periods must have valid, non-overlapping times and finish before midnight');
      }
      end = period.ends_at;
      if (types) {
        const type = types.find((item) => item.id === period.period_type);
        if (!type) throw new BadRequestException('Every period must use a configured period type');
        // Never trust a row-level flag when a reusable definition is supplied.
        period.is_teaching = type.is_teaching;
      }
    }
  }
}
