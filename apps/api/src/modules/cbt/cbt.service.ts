import { Injectable } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { SimpleOperationsService } from '../implementation100/simple-operations';
import { CbtRepository } from './repositories/cbt.repository';

@Injectable()
export class CbtService extends SimpleOperationsService {
  constructor(requestContext: RequestContextService, repository: CbtRepository) {
    super(requestContext, repository, {
      permissionPrefix: 'cbt',
      moduleName: 'CBT Exams',
      entityName: 'cbt',
      defaultStatus: 'scheduled',
    });
  }
}
