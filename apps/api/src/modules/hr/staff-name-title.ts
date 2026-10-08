export const STAFF_NAME_TITLES = ['', 'Mr.', 'Mrs.', 'Ms.', 'Miss', 'Dr.', 'Prof.', 'Rev.'] as const;

// Keep the existing display-name contract across staff consumers and HR updates.
// NULL preserves legacy names until the staff member explicitly chooses a title.
export const STAFF_NAME_TITLE_SCHEMA_SQL = `
ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS name_title text
  CHECK (name_title IS NULL OR name_title IN ('', 'Mr.', 'Mrs.', 'Ms.', 'Miss', 'Dr.', 'Prof.', 'Rev.'));
CREATE OR REPLACE FUNCTION apply_staff_name_title() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.name_title IS NOT NULL THEN
    NEW.display_name := concat_ws(' ', NULLIF(NEW.name_title, ''),
      regexp_replace(trim(NEW.display_name), '^(mr|mrs|ms|miss|dr|prof|rev)[.]?[[:space:]]+', '', 'i'));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_staff_name_title ON staff_profiles;
CREATE TRIGGER trg_staff_name_title BEFORE INSERT OR UPDATE OF display_name, name_title
  ON staff_profiles FOR EACH ROW EXECUTE FUNCTION apply_staff_name_title();
`;
