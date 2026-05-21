import { Injectable } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { SimpleOperationsService } from '../implementation100/simple-operations';
import { AssetsRepository } from './repositories/assets.repository';

@Injectable()
export class AssetsService extends SimpleOperationsService {
  constructor(requestContext: RequestContextService, repository: AssetsRepository) {
    super(requestContext, repository, {
      permissionPrefix: 'assets',
      moduleName: 'Asset Tracking',
      entityName: 'assets',
      defaultStatus: 'active',
    });
  }
}
