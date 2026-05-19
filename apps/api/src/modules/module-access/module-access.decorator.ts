import { SetMetadata } from '@nestjs/common';

import type { ModuleCode } from './module-access.constants';

export const MODULE_ACCESS_KEY = 'module_access';

export const RequiresModule = (...moduleCodes: ModuleCode[]) =>
  SetMetadata(MODULE_ACCESS_KEY, moduleCodes);
