// Serialize child writes with configuration/deletion without validating historical legacy rows.
export const EXAM_SETUP_INTEGRITY_SCHEMA = `
  ALTER TABLE exam_series ADD COLUMN IF NOT EXISTS exam_type text NOT NULL DEFAULT 'Exam cycle';
  CREATE OR REPLACE FUNCTION enforce_exam_setup_parent() RETURNS trigger LANGUAGE plpgsql AS $$
  DECLARE series_id uuid;
  BEGIN
    IF TG_TABLE_NAME IN ('exam_invigilators', 'exam_attendance_records') THEN
      SELECT exam_series_id INTO series_id FROM exam_timetable_slots
      WHERE tenant_id = NEW.tenant_id AND id = NEW.timetable_slot_id;
    ELSIF TG_TABLE_NAME = 'exam_assessment_components' THEN
      SELECT exam_series_id INTO series_id FROM exam_assessments
      WHERE tenant_id = NEW.tenant_id AND id = NEW.assessment_id;
    ELSIF TG_TABLE_NAME = 'report_card_artifacts' THEN
      SELECT exam_series_id INTO series_id FROM student_report_cards
      WHERE tenant_id = NEW.tenant_id AND id = NEW.report_card_id FOR SHARE;
    ELSIF TG_TABLE_NAME IN ('exam_mark_versions', 'exam_mark_import_batch_items') THEN
      SELECT exam_series_id INTO series_id FROM exam_marks
      WHERE tenant_id = NEW.tenant_id AND id = NEW.mark_id FOR SHARE;
    ELSE
      series_id := NEW.exam_series_id;
      IF series_id IS NULL THEN RETURN NEW; END IF;
    END IF;
    PERFORM id FROM exam_series WHERE tenant_id = NEW.tenant_id AND id = series_id FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Exam cycle no longer exists in this school' USING ERRCODE = '23503';
    END IF;
    IF TG_TABLE_NAME = 'exam_marks' THEN
      PERFORM id FROM exam_assessments WHERE tenant_id = NEW.tenant_id AND id = NEW.assessment_id
        AND exam_series_id = series_id AND subject_id = NEW.subject_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Assessment no longer belongs to this exam' USING ERRCODE = '23503';
      END IF;
      IF EXISTS (SELECT 1 FROM exam_mark_entry_windows WHERE tenant_id = NEW.tenant_id AND exam_series_id = series_id)
        AND NOT EXISTS (SELECT 1 FROM exam_mark_entry_windows WHERE tenant_id = NEW.tenant_id
          AND exam_series_id = series_id AND subject_id = NEW.subject_id AND class_section_id = NEW.class_section_id) THEN
        RAISE EXCEPTION 'Class and subject are no longer configured for this exam' USING ERRCODE = '23503';
      END IF;
    END IF;
    RETURN NEW;
  END $$;
  DO $$ DECLARE target text; BEGIN
    FOREACH target IN ARRAY ARRAY['exam_marks', 'exam_assessments', 'exam_mark_entry_windows',
      'student_report_cards', 'exam_result_snapshots', 'report_card_generation_batches',
      'exam_timetable_slots', 'exam_student_cases', 'academic_interventions', 'exam_grade_boundaries',
      'exam_grading_policies', 'exam_invigilators', 'exam_attendance_records', 'exam_assessment_components',
      'report_card_artifacts', 'exam_mark_versions', 'exam_mark_import_batch_items'] LOOP
      EXECUTE format('DROP TRIGGER IF EXISTS exam_setup_parent_guard ON %I', target);
      EXECUTE format('CREATE TRIGGER exam_setup_parent_guard BEFORE INSERT OR UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION enforce_exam_setup_parent()', target);
    END LOOP;
  END $$;
`;
