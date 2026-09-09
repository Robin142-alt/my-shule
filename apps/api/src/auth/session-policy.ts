import type { AuthSessionRecord } from './auth.interfaces';

export const REGULAR_SESSION_TTL_SECONDS = 14 * 24 * 60 * 60;

// The original login is the deadline anchor, including sessions issued before
// this policy. Refreshing or switching a dashboard must never move it forward.
export function regularSessionExpiresAt(session: Pick<AuthSessionRecord, 'created_at' | 'refresh_expires_at'>): string {
  return new Date(Math.min(
    Date.parse(session.created_at) + REGULAR_SESSION_TTL_SECONDS * 1000,
    Date.parse(session.refresh_expires_at),
  )).toISOString();
}
