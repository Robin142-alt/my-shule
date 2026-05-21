import { Injectable } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { SimpleOperationsService } from '../implementation100/simple-operations';
import { HostelRepository } from './repositories/hostel.repository';

@Injectable()
export class HostelService extends SimpleOperationsService {
  constructor(requestContext: RequestContextService, repository: HostelRepository) {
    super(requestContext, repository, {
      permissionPrefix: 'hostel',
      moduleName: 'Hostel',
      entityName: 'hostel',
      defaultStatus: 'open',
    });
  }
}
