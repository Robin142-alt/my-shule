import { Test, TestingModule } from '@nestjs/testing';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

describe('Operations', () => {
  let controller: OperationsController;

  const mockOperationsService = {
    reportEmergency: jest.fn(),
    createAlert: jest.fn(),
    submitReport: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OperationsController],
      providers: [
        {
          provide: OperationsService,
          useValue: mockOperationsService,
        },
      ],
    }).compile();

    controller = module.get<OperationsController>(OperationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call reportEmergency', async () => {
    const dto = { title: 'Fire', description: 'Fire in lab', severity: 'Critical' };
    mockOperationsService.reportEmergency.mockResolvedValue(dto);
    expect(await controller.reportEmergency(dto)).toEqual(dto);
    expect(mockOperationsService.reportEmergency).toHaveBeenCalledWith(dto);
  });
});
