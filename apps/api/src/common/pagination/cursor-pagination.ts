export interface CreatedAtIdCursor {
  created_at: string;
  id: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class InvalidCursorError extends Error {
  constructor() {
    super('Invalid pagination cursor');
  }
}

export function encodeCreatedAtIdCursor(input: CreatedAtIdCursor): string {
  assertValidCreatedAtIdCursor(input);

  return Buffer.from(JSON.stringify(input), 'utf8').toString('base64url');
}

export function decodeCreatedAtIdCursor(cursor: string): CreatedAtIdCursor {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as Partial<CreatedAtIdCursor>;
    const value = {
      created_at: String(parsed.created_at ?? ''),
      id: String(parsed.id ?? ''),
    };
    assertValidCreatedAtIdCursor(value);

    return value;
  } catch (error) {
    if (error instanceof InvalidCursorError) {
      throw error;
    }

    throw new InvalidCursorError();
  }
}

export function normalizeCursorLimit(
  limit: number | null | undefined,
  defaultLimit = 50,
  maxLimit = 200,
): number {
  if (!Number.isFinite(limit)) {
    return defaultLimit;
  }

  return Math.min(Math.max(Math.trunc(Number(limit)), 1), maxLimit);
}

function assertValidCreatedAtIdCursor(input: CreatedAtIdCursor): void {
  if (Number.isNaN(Date.parse(input.created_at)) || !UUID_PATTERN.test(input.id)) {
    throw new InvalidCursorError();
  }
}
