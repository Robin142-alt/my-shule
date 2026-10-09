import { SetMetadata } from '@nestjs/common';
export const ALLOW_PENDING_LEGAL = 'allowPendingLegal';
export const AllowPendingLegal = () => SetMetadata(ALLOW_PENDING_LEGAL, true);
