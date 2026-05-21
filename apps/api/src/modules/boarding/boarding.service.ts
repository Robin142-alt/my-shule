import { Injectable } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { SimpleOperationsService } from '../implementation100/simple-operations';
import { BoardingRepository } from './repositories/boarding.repository';

@Injectable()
export class BoardingService extends SimpleOperationsService {
  constructor(requestContext: RequestContextService, repository: BoardingRepository) {
    super(requestContext, repository, {
      permissionPrefix: 'boarding',
      moduleName: 'Boarding',
      entityName: 'boarding',
      defaultStatus: 'active',
    });
  }
}
