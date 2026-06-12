import { Module, Global } from '@nestjs/common';
import { WidgetRegistryService } from './widget-registry.service';

@Global()
@Module({
  providers: [WidgetRegistryService],
  exports: [WidgetRegistryService],
})
export class WidgetRegistryModule {}
