import { Injectable, NotImplementedException } from '@nestjs/common';
import { SafaricomCollectionAdapter } from './safaricom-collection.adapter';
import type { CollectionAdapter } from './collection-adapter';

@Injectable()
export class CollectionAdapterRegistry {
  private readonly adapters: ReadonlyMap<string, CollectionAdapter>;
  constructor(safaricom: SafaricomCollectionAdapter) {
    // Add a bank adapter here only after its merchant authentication/verification
    // contract is implemented and tested. Catalog presence is not capability.
    this.adapters = new Map([[safaricom.provider, safaricom]]);
  }
  get(provider: string): CollectionAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new NotImplementedException('This provider supports statement review only');
    return adapter;
  }
}
