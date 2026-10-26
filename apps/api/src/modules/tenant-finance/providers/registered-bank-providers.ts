import { BANK_PROVIDERS } from '../bank-provider.catalog';
import { BankProviderRegistry } from './bank-provider-registry';
import { EquityJengaAdapter } from './equity-jenga.adapter';
import { KcbBuniAdapter } from './kcb-buni.adapter';
import type { BankProviderAdapter } from './bank-provider';

/** The only bank composition list. Future adapters add no accounting-specific branches. */
const adapters:readonly BankProviderAdapter[]=[new EquityJengaAdapter(),new KcbBuniAdapter()];
export const BANK_PROVIDER_REGISTRY=new BankProviderRegistry();
for(const definition of BANK_PROVIDERS) {
  const adapter=adapters.find(item=>item.provider===definition.code);
  BANK_PROVIDER_REGISTRY.register(definition,adapter);
}
