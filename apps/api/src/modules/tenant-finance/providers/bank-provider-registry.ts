import type { CollectionProviderDefinition } from '../payment-provider.catalog';
import type { BankProviderAdapter } from './bank-provider';

/** Registration is application composition, never user-submitted executable code. */
export class BankProviderRegistry {
  private readonly providers=new Map<string,{definition:CollectionProviderDefinition;adapter?:BankProviderAdapter}>();
  register(definition:CollectionProviderDefinition,adapter?:BankProviderAdapter){
    if(!/^[a-z][a-z0-9_]{1,63}$/.test(definition.code)) throw Error('Invalid registered provider code');
    if(this.providers.has(definition.code)) throw Error('Provider already registered');
    if(adapter&&adapter.provider!==definition.code) throw Error('Adapter and provider codes must match');
    const implemented=Boolean(adapter?.retrieveTransactions||adapter?.notifications);
    if(definition.connection_modes.includes('bank_api')&&!implemented) throw Error('Bank API mode requires an implemented adapter');
    const connection_modes=[...new Set([...definition.connection_modes,...(implemented?['bank_api']:[])])];
    this.providers.set(definition.code,{definition:{...definition,connection_modes,
      ...(adapter?{bank_api_environments:adapter.environments ?? ['sandbox','production'] as const}:{})},adapter});
  }
  definition(code:string){
    const registration=this.providers.get(code);
    if(!registration) throw Error('Bank provider is not registered');
    return registration.definition;
  }
  definitions(){return [...this.providers.values()].map(({definition})=>({...definition,capabilities:this.capabilities(definition.code)}));}
  adapter(code:string):BankProviderAdapter{
    this.definition(code);
    const adapter=this.providers.get(code)!.adapter;
    if(!adapter) throw Error('Direct bank protocol is not implemented; use reviewed statements');
    return adapter;
  }
  capabilities(code:string){
    this.definition(code);
    const adapter=this.providers.get(code)!.adapter;
    return adapter?['connection_check',...(adapter.retrieveTransactions?['transaction_retrieval']:[]),
      ...(adapter.queryTransaction?['transaction_query']:[]),...(adapter.notifications?['notifications']:[])]:[];
  }
  /** Composition/testing only; no school-facing endpoint can remove an adapter. */
  remove(code:string){this.providers.delete(code);}
}
