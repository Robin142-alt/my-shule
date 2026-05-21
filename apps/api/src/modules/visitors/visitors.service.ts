import { Injectable } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { SimpleOperationsService } from '../implementation100/simple-operations';
import { VisitorsRepository } from './repositories/visitors.repository';

@Injectable()
export class VisitorsService extends SimpleOperationsService {
  constructor(requestContext: RequestContextService, repository: VisitorsRepository) {
    super(requestContext, repository, {
      permissionPrefix: 'visitors',
      moduleName: 'Visitor Management',
      entityName: 'visitors',
      defaultStatus: 'checked_in',
    });
  }
}
