import { ForbiddenException } from '@nestjs/common';
import type { RequestContextState } from '../../common/request-context/request-context.types';

// The selected teacher scopes the roster; the authenticated manager stays the actor.
export function requireAssistedMarkEntryScope(context?: RequestContextState) {
  const role = String(context?.role ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const permissions = context?.permissions ?? [];
  if (!context?.is_authenticated || !context.tenant_id || !context.user_id
    || !['exams_manager', 'exams_officer', 'exam_manager', 'exam_officer'].includes(role)
    || !['exams:write', 'exams:enter-marks'].every(permission => permissions.includes(permission) || permissions.includes('*:*'))) {
    throw new ForbiddenException('Exams Manager mark-entry permission is required to assist a teacher.');
  }
  return { tenantId: context.tenant_id, actorUserId: context.user_id };
}
