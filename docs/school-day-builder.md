# School day builder

Deputy Principal → Timetable → School Day & Periods builds a day by clicking reusable period types. A single start time and type defaults supply times; lessons are numbered automatically. Inserting, removing, reordering, changing a type, or editing a time recalculates following periods while retaining their occurrence durations. Copying a day replaces selected days, including common blocks, with independently editable occurrences.

Type management contains only a name, normal duration, and teaching status. Changing a default affects new occurrences; it does not overwrite existing custom times. Row type changes use the selected type's current default. Non-teaching rows have no redundant teaching checkbox. Common blocks and day options remain available behind disclosures.

The existing tenant/academic-term configuration stores `period_types` and `school_starts_at` using an additive schema bootstrap. Legacy records retain their times, IDs, and teaching semantics. Older clients may omit the new fields without erasing them. The API derives teaching status from saved definitions, rejects overlapping times and unknown types, and retains concurrency checks, transactional audit records, and the existing `timetable.configuration.updated` event and dashboard refresh path. Retained period IDs are updated in place so saving does not cascade-delete teacher availability.

Verification includes the exact seven-click example, time overrides, insertion/deletion/reordering, copying and independent edits, custom type persistence, failure and offline states, active-school changes, PostgreSQL rollback/concurrency, RLS, authorization metadata, and event emission. Browser checks covered 1440, 1024, 390, and 320 pixel widths. The browser component harness uses simulated API responses; persistence is separately verified against disposable PostgreSQL.

Release the API before the frontend so the new fields are persisted. Published timetable snapshots and the existing publish/approval workflow remain separate from school-day setup.
