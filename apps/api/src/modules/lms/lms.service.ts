import { Injectable } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { SimpleOperationsService } from '../implementation100/simple-operations';
import { LmsRepository } from './repositories/lms.repository';

@Injectable()
export class LmsService extends SimpleOperationsService {
  constructor(requestContext: RequestContextService, repository: LmsRepository) {
    super(requestContext, repository, {
      permissionPrefix: 'lms',
      moduleName: 'LMS',
      entityName: 'lms',
      defaultStatus: 'open',
    });
  }
}
