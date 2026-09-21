/** Pure planning over a tenant-scoped snapshot; saved subject counts remain editable. */
export function sameTeachingGroup(left: any, right: any): boolean {
  return String(left.class_section_id) === String(right.class_section_id)
    && (!left.stream_id || !right.stream_id || String(left.stream_id) === String(right.stream_id));
}

export function blockAppliesTo(block: any, group: any): boolean {
  const targets = (block.target_ids ?? []).map(String);
  return block.target_scope === 'school'
    || (['class', 'grade'].includes(block.target_scope) && targets.includes(String(group.class_section_id)))
    || (block.target_scope === 'stream' && targets.includes(String(group.stream_id)));
}

export function teachingCells(configuration: any, group: any): any[] {
  return (configuration?.days ?? []).filter((day: any) => day.is_teaching_day).flatMap((day: any) => {
    const periods = [...day.periods].sort((a: any, b: any) => a.order_index - b.order_index);
    const reserved = new Set<string>();
    for (const block of configuration.common_blocks ?? []) {
      if (Number(block.day_of_week) !== Number(day.day_of_week) || !blockAppliesTo(block, group)) continue;
      const start = periods.findIndex((period: any) => period.id === block.period_id);
      if (start >= 0) periods.slice(start, start + Number(block.duration_periods || 1)).forEach((period: any) => reserved.add(period.id));
    }
    return periods.filter((period: any) => period.is_teaching && !reserved.has(period.id))
      .map((period: any) => ({ ...period, day_of_week: Number(day.day_of_week) }));
  });
}

export function slotCoversCell(slot: any, cell: any): boolean {
  return Number(slot.day_of_week) === cell.day_of_week
    && String(slot.starts_at).slice(0, 5) <= String(cell.starts_at).slice(0, 5)
    && String(slot.ends_at).slice(0, 5) >= String(cell.ends_at).slice(0, 5);
}

export function teachingGroups(requirements: any[]): any[] {
  const groups = [...new Map(requirements.filter((row) => row.status === 'active')
    .map((row) => [JSON.stringify([row.class_section_id, row.stream_id ?? null]), row])).values()];
  return groups.filter((group) => group.stream_id || !groups.some((other) => other.class_section_id === group.class_section_id && other.stream_id));
}

export function balanceRequirements(snapshot: any) {
  const requirements: any[] = (snapshot.requirements ?? []).map((row: any) => ({ ...row }));
  const issues: Array<{ code: string; message: string }> = [];
  const groups = teachingGroups(requirements);
  for (const group of groups) {
    const members = requirements.filter((row: any) => row.status === 'active' && sameTeachingGroup(row, group));
    const label = `${group.class_name || group.class_section_id}${group.stream_name ? ` / ${group.stream_name}` : ''}`;
    const cells = teachingCells(snapshot.configuration, group);
    const ids = new Set(members.map((row: any) => String(row.id)));
    // Manual lessons without a requirement already occupy part of the week.
    const manual = (snapshot.slots ?? []).filter((slot: any) => sameTeachingGroup(slot, group)
      && !ids.has(String(slot.requirement_id)));
    const capacity = cells.filter((cell) => !manual.some((slot: any) => slotCoversCell(slot, cell))).length;
    const units = [...new Map<string, any[]>(members.map((row: any) => [row.parallel_key ? `parallel:${row.parallel_key}` : `subject:${row.id}`, []])).entries()];
    for (const [key, rows] of units) rows.push(...members.filter((row: any) => (row.parallel_key ? `parallel:${row.parallel_key}` : `subject:${row.id}`) === key));
    const planned = units.map(([key, rows]) => {
      const fixed = rows.filter((row) => row.weekly_periods_mode === 'fixed');
      const fixedCounts = new Set(fixed.map((row) => Number(row.periods_per_week)));
      const locked = Math.max(0, ...rows.map((row) => (snapshot.slots ?? []).filter((slot: any) => slot.locked && String(slot.requirement_id) === String(row.id))
        .reduce((sum: number, slot: any) => sum + Number(slot.duration_periods || 1), 0)));
      if (fixedCounts.size > 1) issues.push({ code: 'PARALLEL_COUNTS_DIFFER', message: `${label}: subjects in parallel group ${rows[0].parallel_key} need matching fixed period counts.` });
      const count = fixed.length ? Number(fixed[0].periods_per_week) : Math.max(1, locked);
      if (locked > count) issues.push({ code: 'LOCKED_PERIODS_EXCEED_TARGET', message: `${label}: unlock lessons or increase the fixed count for ${rows[0].subject_name || rows[0].subject_id}.` });
      if (!fixed.length && rows.some((row) => !row.stream_id) && group.stream_id
        && groups.some((other) => other.class_section_id === group.class_section_id && other.stream_id !== group.stream_id)) {
        issues.push({ code: 'AUTO_STREAM_REQUIRED', message: `${label}: choose a stream for automatic subjects shared across multiple streams, or set their periods to Fixed.` });
      }
      return { key, rows, count, fixed: fixed.length > 0 };
    });
    let remaining = capacity - planned.reduce((sum, unit) => sum + unit.count, 0);
    const automatic = planned.filter((unit) => !unit.fixed);
    while (remaining > 0 && automatic.length) {
      automatic.sort((a, b) => a.count - b.count || String(a.rows[0].subject_id).localeCompare(String(b.rows[0].subject_id)));
      automatic[0].count += 1;
      remaining -= 1;
    }
    if (remaining !== 0) issues.push({ code: remaining > 0 ? 'UNFILLED_WEEK' : 'WEEK_OVER_CAPACITY', message: remaining > 0
      ? `${label}: ${remaining} teaching periods have no subject. Set at least one subject to Auto-balance or increase the fixed counts to fill all ${capacity} periods.`
      : `${label}: fixed counts and locked lessons exceed the ${capacity} available periods by ${-remaining}. Reduce fixed counts or unlock lessons.` });
    for (const unit of planned) for (const row of unit.rows) row.periods_per_week = unit.count;
  }
  return { requirements, issues, groups };
}

export function uncoveredTeachingCells(snapshot: any) {
  return teachingGroups(snapshot.requirements ?? []).flatMap((group) => teachingCells(snapshot.configuration, group)
    .filter((cell) => !(snapshot.slots ?? []).some((slot: any) => sameTeachingGroup(slot, group) && slotCoversCell(slot, cell)))
    .map((cell) => ({ class_section_id: group.class_section_id, class_name: group.class_name, stream_id: group.stream_id,
      day_of_week: cell.day_of_week, period_id: cell.id, starts_at: cell.starts_at })));
}
