/** Additive bootstrap migration. Existing weights and published report snapshots are retained. */
export const FLEXIBLE_EXAM_PAPERS_SCHEMA = `
  ALTER TABLE exam_assessments ALTER COLUMN weight DROP NOT NULL;
  ALTER TABLE exam_assessments ALTER COLUMN weight DROP DEFAULT;
  ALTER TABLE exam_assessments ADD COLUMN IF NOT EXISTS uses_categories boolean NOT NULL DEFAULT FALSE;
  ALTER TABLE exam_assessments ADD COLUMN IF NOT EXISTS paper_order integer NOT NULL DEFAULT 0;
  ALTER TABLE exam_mark_entry_windows ADD COLUMN IF NOT EXISTS paper_config_version integer NOT NULL DEFAULT 1;
  ALTER TABLE exam_marks ADD COLUMN IF NOT EXISTS category_scores jsonb NOT NULL DEFAULT '{}'::jsonb;
  ALTER TABLE exam_mark_import_batch_items ADD COLUMN IF NOT EXISTS previous_category_scores jsonb;
  ALTER TABLE exam_mark_import_batch_items ADD COLUMN IF NOT EXISTS imported_category_scores jsonb NOT NULL DEFAULT '{}'::jsonb;
  ALTER TABLE exam_result_snapshots ALTER COLUMN average_percentage DROP NOT NULL;
  ALTER TABLE exam_result_snapshots ALTER COLUMN raw_total DROP NOT NULL;
  ALTER TABLE exam_assessments DROP CONSTRAINT IF EXISTS uq_exam_assessments_scope;
  CREATE UNIQUE INDEX IF NOT EXISTS ux_exam_assessments_scope
    ON exam_assessments (tenant_id,exam_series_id,subject_id,name) WHERE class_section_id IS NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS ux_exam_assessments_class_scope
    ON exam_assessments (tenant_id,exam_series_id,subject_id,class_section_id,name) WHERE class_section_id IS NOT NULL;

  CREATE OR REPLACE FUNCTION enforce_exam_paper_mark() RETURNS trigger LANGUAGE plpgsql AS $$
  DECLARE paper exam_assessments; section record; evidence jsonb; total numeric := 0; missing boolean := FALSE; irregular boolean := FALSE;
  BEGIN
    -- Serialize configuration changes and concurrent writers at the examination boundary.
    PERFORM 1 FROM exam_series WHERE tenant_id=NEW.tenant_id AND id=NEW.exam_series_id FOR UPDATE;
    SELECT * INTO paper FROM exam_assessments WHERE tenant_id = NEW.tenant_id AND id = NEW.assessment_id FOR SHARE;
    IF NOT FOUND OR paper.exam_series_id<>NEW.exam_series_id OR paper.subject_id<>NEW.subject_id
      OR (paper.class_section_id IS NOT NULL AND paper.class_section_id <> NEW.class_section_id)
      OR (paper.class_section_id IS NULL AND EXISTS (SELECT 1 FROM exam_assessments scoped WHERE scoped.tenant_id=NEW.tenant_id
        AND scoped.exam_series_id=NEW.exam_series_id AND scoped.subject_id=NEW.subject_id AND scoped.class_section_id=NEW.class_section_id)) THEN
      RAISE EXCEPTION 'Paper does not belong to this class and school' USING ERRCODE = '23514';
    END IF;
    IF NEW.score IS NOT NULL AND (NEW.score < 0 OR NEW.score > paper.max_score) THEN
      RAISE EXCEPTION 'Score exceeds the paper maximum' USING ERRCODE = '23514';
    END IF;
    IF jsonb_typeof(NEW.category_scores) <> 'object' THEN
      RAISE EXCEPTION 'Category scores must be an object' USING ERRCODE = '23514';
    END IF;
    IF paper.uses_categories AND NEW.category_scores <> '{}'::jsonb THEN
      IF EXISTS (SELECT 1 FROM jsonb_object_keys(NEW.category_scores) key WHERE NOT EXISTS (
        SELECT 1 FROM exam_assessment_components c WHERE c.tenant_id = NEW.tenant_id AND c.assessment_id = paper.id AND c.id::text = key)) THEN
        RAISE EXCEPTION 'Category does not belong to this paper' USING ERRCODE = '23514';
      END IF;
      FOR section IN SELECT * FROM exam_assessment_components WHERE tenant_id = NEW.tenant_id AND assessment_id = paper.id LOOP
        evidence := NEW.category_scores->section.id::text;
        IF evidence IS NULL OR evidence = 'null'::jsonb OR evidence = '"X"'::jsonb THEN missing := TRUE;
        ELSIF evidence = '"Y"'::jsonb THEN irregular := TRUE;
        ELSIF jsonb_typeof(evidence) <> 'number' OR (evidence::text)::numeric < 0 OR (evidence::text)::numeric > section.max_score THEN
          RAISE EXCEPTION 'Invalid category score' USING ERRCODE = '23514';
        ELSE total := total + (evidence::text)::numeric;
        END IF;
      END LOOP;
      IF NEW.score_status<>'exempt' THEN
        NEW.score_status := CASE WHEN irregular THEN 'Y'
          WHEN missing THEN CASE WHEN NEW.score_status IN ('absent','not_assessed','incomplete','withheld','medical_exception','transfer_student')
            THEN NEW.score_status ELSE 'X' END ELSE 'entered' END;
        NEW.score := CASE WHEN irregular OR missing THEN NULL ELSE total END;
      END IF;
    ELSIF NOT paper.uses_categories AND NEW.category_scores <> '{}'::jsonb THEN
      RAISE EXCEPTION 'This paper does not use categories' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END $$;
  DROP TRIGGER IF EXISTS exam_paper_mark_guard ON exam_marks;
  CREATE TRIGGER exam_paper_mark_guard BEFORE INSERT OR UPDATE ON exam_marks
    FOR EACH ROW EXECUTE FUNCTION enforce_exam_paper_mark();

  CREATE OR REPLACE FUNCTION protect_exam_paper_configuration() RETURNS trigger LANGUAGE plpgsql AS $$
  DECLARE paper exam_assessments; series exam_series;
  BEGIN
    IF TG_OP='UPDATE' AND (to_jsonb(OLD)-'updated_at')=(to_jsonb(NEW)-'updated_at') THEN RETURN NEW; END IF;
    IF TG_TABLE_NAME='exam_assessments' THEN paper:=COALESCE(NEW,OLD);
    ELSE SELECT * INTO paper FROM exam_assessments WHERE tenant_id=COALESCE(NEW.tenant_id,OLD.tenant_id)
      AND id=COALESCE(NEW.assessment_id,OLD.assessment_id); END IF;
    SELECT * INTO series FROM exam_series WHERE tenant_id=paper.tenant_id AND id=paper.exam_series_id FOR UPDATE;
    IF series.status IN ('locked','published','archived') OR series.locked_at IS NOT NULL OR series.published_at IS NOT NULL THEN
      RAISE EXCEPTION 'Reopen this examination before changing papers' USING ERRCODE='23514';
    END IF;
    IF EXISTS(SELECT 1 FROM exam_marks m WHERE m.tenant_id=paper.tenant_id AND m.assessment_id=paper.id
      AND (m.status<>'draft' OR TG_OP='DELETE' OR (TG_TABLE_NAME='exam_assessment_components' AND paper.uses_categories))) THEN
      RAISE EXCEPTION 'Return submitted marks for correction; papers and categories with saved marks cannot be removed' USING ERRCODE='23514';
    END IF;
    IF TG_TABLE_NAME='exam_assessments' AND TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM exam_marks m
      WHERE m.tenant_id=paper.tenant_id AND m.assessment_id=paper.id AND m.score>paper.max_score) THEN
      RAISE EXCEPTION 'The new maximum is below a saved mark' USING ERRCODE='23514';
    END IF;
    RETURN COALESCE(NEW,OLD);
  END $$;
  DROP TRIGGER IF EXISTS exam_paper_configuration_guard ON exam_assessments;
  CREATE TRIGGER exam_paper_configuration_guard BEFORE INSERT OR UPDATE OR DELETE ON exam_assessments
    FOR EACH ROW EXECUTE FUNCTION protect_exam_paper_configuration();
  DROP TRIGGER IF EXISTS exam_category_configuration_guard ON exam_assessment_components;
  CREATE TRIGGER exam_category_configuration_guard BEFORE INSERT OR UPDATE OR DELETE ON exam_assessment_components
    FOR EACH ROW EXECUTE FUNCTION protect_exam_paper_configuration();

  CREATE OR REPLACE FUNCTION validate_exam_category_total() RETURNS trigger LANGUAGE plpgsql AS $$
  DECLARE paper exam_assessments; total numeric;
  BEGIN
    IF TG_TABLE_NAME='exam_assessments' THEN SELECT * INTO paper FROM exam_assessments WHERE tenant_id=COALESCE(NEW.tenant_id,OLD.tenant_id) AND id=COALESCE(NEW.id,OLD.id);
    ELSE SELECT * INTO paper FROM exam_assessments WHERE tenant_id=COALESCE(NEW.tenant_id,OLD.tenant_id) AND id=COALESCE(NEW.assessment_id,OLD.assessment_id); END IF;
    IF paper.uses_categories THEN
      SELECT SUM(max_score) INTO total FROM exam_assessment_components WHERE tenant_id=paper.tenant_id AND assessment_id=paper.id;
      IF total IS NULL OR total<>paper.max_score THEN
        RAISE EXCEPTION 'Paper maximum must equal its category maxima' USING ERRCODE='23514';
      END IF;
    END IF;
    RETURN NULL;
  END $$;
  DROP TRIGGER IF EXISTS exam_paper_category_total ON exam_assessments;
  CREATE CONSTRAINT TRIGGER exam_paper_category_total AFTER INSERT OR UPDATE ON exam_assessments
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_exam_category_total();
  DROP TRIGGER IF EXISTS exam_category_total ON exam_assessment_components;
  CREATE CONSTRAINT TRIGGER exam_category_total AFTER INSERT OR UPDATE OR DELETE ON exam_assessment_components
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_exam_category_total();

  -- Legacy manager endpoints also invalidate open editors and processed draft results.
  CREATE OR REPLACE FUNCTION invalidate_exam_paper_configuration() RETURNS trigger LANGUAGE plpgsql AS $$
  DECLARE paper exam_assessments;
  BEGIN
    IF current_setting('app.saving_exam_papers',true)='1' THEN RETURN NULL; END IF;
    IF TG_OP='UPDATE' AND (to_jsonb(OLD)-'updated_at')=(to_jsonb(NEW)-'updated_at') THEN RETURN NULL; END IF;
    IF TG_TABLE_NAME='exam_assessments' THEN paper:=COALESCE(NEW,OLD);
    ELSE SELECT * INTO paper FROM exam_assessments WHERE tenant_id=COALESCE(NEW.tenant_id,OLD.tenant_id) AND id=COALESCE(NEW.assessment_id,OLD.assessment_id); END IF;
    UPDATE exam_mark_entry_windows SET paper_config_version=paper_config_version+1,updated_at=NOW()
      WHERE tenant_id=paper.tenant_id AND exam_series_id=paper.exam_series_id AND subject_id=paper.subject_id
        AND (paper.class_section_id IS NULL OR class_section_id=paper.class_section_id);
    DELETE FROM exam_result_snapshots WHERE tenant_id=paper.tenant_id AND exam_series_id=paper.exam_series_id
      AND (paper.class_section_id IS NULL OR class_section_id=paper.class_section_id);
    RETURN NULL;
  END $$;
  DROP TRIGGER IF EXISTS exam_paper_configuration_changed ON exam_assessments;
  CREATE TRIGGER exam_paper_configuration_changed AFTER INSERT OR UPDATE OR DELETE ON exam_assessments
    FOR EACH ROW EXECUTE FUNCTION invalidate_exam_paper_configuration();
  DROP TRIGGER IF EXISTS exam_category_configuration_changed ON exam_assessment_components;
  CREATE TRIGGER exam_category_configuration_changed AFTER INSERT OR UPDATE OR DELETE ON exam_assessment_components
    FOR EACH ROW EXECUTE FUNCTION invalidate_exam_paper_configuration();
`;
