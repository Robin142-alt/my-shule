import { Test, TestingModule } from '@nestjs/testing';
import { SecurityOperationsController } from './security-operations.controller';
import { SecurityOperationsService } from './security-operations.service';

describe('SecurityOperations', () => {
  let controller: SecurityOperationsController;

  const mockSecurityService = {
    reportIncident: jest.fn(),
    triggerPanicAlert: jest.fn(),
    createVisitorRecord: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SecurityOperationsController],
      providers: [
        {
          provide: SecurityOperationsService,
          useValue: mockSecurityService,
        },
      ],
    }).compile();

    controller = module.get<SecurityOperationsController>(SecurityOperationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call reportIncident', async () => {
    const dto = { title: 'Test', description: 'Test', severity: 'High', location: 'Gate' };
    mockSecurityService.reportIncident.mockResolvedValue(dto);
    expect(await controller.createIncident(dto)).toEqual(dto);
    expect(mockSecurityService.reportIncident).toHaveBeenCalledWith(dto);
  });
});
