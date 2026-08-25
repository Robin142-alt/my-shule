/**
 * Canonical audience predicate for school notifications. Explicit user and
 * guardian recipients take precedence so role matching cannot expose a
 * notification addressed to another account or family.
 */
export function notificationRecipientPredicate(
  alias: string,
  userParameter: string,
  roleParameter: string,
): string {
  return `(
    (
      COALESCE(
        ${alias}.recipient_user_id::text,
        NULLIF(${alias}.metadata->>'targetUserId', ''),
        NULLIF(${alias}.metadata->>'recipientUserId', ''),
        NULLIF(${alias}.metadata->>'target_user_id', ''),
        NULLIF(${alias}.metadata->>'recipient_user_id', '')
      ) IS NOT NULL
      AND COALESCE(
        ${alias}.recipient_user_id::text,
        NULLIF(${alias}.metadata->>'targetUserId', ''),
        NULLIF(${alias}.metadata->>'recipientUserId', ''),
        NULLIF(${alias}.metadata->>'target_user_id', ''),
        NULLIF(${alias}.metadata->>'recipient_user_id', '')
      ) = ${userParameter}::text
    )
    OR (
      COALESCE(
        ${alias}.recipient_user_id::text,
        NULLIF(${alias}.metadata->>'targetUserId', ''),
        NULLIF(${alias}.metadata->>'recipientUserId', ''),
        NULLIF(${alias}.metadata->>'target_user_id', ''),
        NULLIF(${alias}.metadata->>'recipient_user_id', '')
      ) IS NULL
      AND ${alias}.recipient_guardian_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM student_guardians recipient_guardian
        WHERE recipient_guardian.tenant_id = ${alias}.tenant_id
          AND recipient_guardian.id = ${alias}.recipient_guardian_id
          AND recipient_guardian.user_id::text = ${userParameter}::text
          AND recipient_guardian.status = 'active'
      )
    )
    OR (
      COALESCE(
        ${alias}.recipient_user_id::text,
        NULLIF(${alias}.metadata->>'targetUserId', ''),
        NULLIF(${alias}.metadata->>'recipientUserId', ''),
        NULLIF(${alias}.metadata->>'target_user_id', ''),
        NULLIF(${alias}.metadata->>'recipient_user_id', '')
      ) IS NULL
      AND ${alias}.recipient_guardian_id IS NULL
      AND (
        regexp_replace(lower(btrim(COALESCE(${alias}.recipient_role, ''))), '[^a-z0-9]+', '_', 'g')
          = regexp_replace(lower(btrim(${roleParameter}::text)), '[^a-z0-9]+', '_', 'g')
        OR regexp_replace(lower(btrim(COALESCE(${alias}.metadata->>'recipientRole', ''))), '[^a-z0-9]+', '_', 'g')
          = regexp_replace(lower(btrim(${roleParameter}::text)), '[^a-z0-9]+', '_', 'g')
        OR regexp_replace(lower(btrim(COALESCE(${alias}.metadata->>'targetRole', ''))), '[^a-z0-9]+', '_', 'g')
          = regexp_replace(lower(btrim(${roleParameter}::text)), '[^a-z0-9]+', '_', 'g')
        OR regexp_replace(lower(btrim(COALESCE(${alias}.metadata->>'recipient_role', ''))), '[^a-z0-9]+', '_', 'g')
          = regexp_replace(lower(btrim(${roleParameter}::text)), '[^a-z0-9]+', '_', 'g')
        OR regexp_replace(lower(btrim(COALESCE(${alias}.metadata->>'target_role', ''))), '[^a-z0-9]+', '_', 'g')
          = regexp_replace(lower(btrim(${roleParameter}::text)), '[^a-z0-9]+', '_', 'g')
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(
            CASE
              WHEN jsonb_typeof(${alias}.metadata->'target_roles') = 'array'
                THEN ${alias}.metadata->'target_roles'
              ELSE '[]'::jsonb
            END
          ) target_role(value)
          WHERE regexp_replace(lower(btrim(target_role.value)), '[^a-z0-9]+', '_', 'g')
            = regexp_replace(lower(btrim(${roleParameter}::text)), '[^a-z0-9]+', '_', 'g')
        )
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(
            CASE
              WHEN jsonb_typeof(${alias}.metadata->'audienceRoles') = 'array'
                THEN ${alias}.metadata->'audienceRoles'
              ELSE '[]'::jsonb
            END
          ) audience_role(value)
          WHERE regexp_replace(lower(btrim(audience_role.value)), '[^a-z0-9]+', '_', 'g')
            = regexp_replace(lower(btrim(${roleParameter}::text)), '[^a-z0-9]+', '_', 'g')
        )
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(
            CASE
              WHEN jsonb_typeof(${alias}.metadata->'targetRoles') = 'array'
                THEN ${alias}.metadata->'targetRoles'
              ELSE '[]'::jsonb
            END
          ) target_role(value)
          WHERE regexp_replace(lower(btrim(target_role.value)), '[^a-z0-9]+', '_', 'g')
            = regexp_replace(lower(btrim(${roleParameter}::text)), '[^a-z0-9]+', '_', 'g')
        )
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(
            CASE
              WHEN jsonb_typeof(${alias}.metadata->'audience_roles') = 'array'
                THEN ${alias}.metadata->'audience_roles'
              ELSE '[]'::jsonb
            END
          ) audience_role(value)
          WHERE regexp_replace(lower(btrim(audience_role.value)), '[^a-z0-9]+', '_', 'g')
            = regexp_replace(lower(btrim(${roleParameter}::text)), '[^a-z0-9]+', '_', 'g')
        )
      )
    )
  )`;
}
