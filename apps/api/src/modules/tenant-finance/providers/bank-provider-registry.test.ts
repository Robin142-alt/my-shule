import assert from 'node:assert/strict';
import test from 'node:test';
import { BankProviderRegistry } from './bank-provider-registry';
import type { BankProviderAdapter } from './bank-provider';

test('a twelfth provider registers and is discovered using only its definition and adapter',async()=>{
  const registry=new BankProviderRegistry();
  const adapter:BankProviderAdapter={provider:'test_bank',channel_kinds:['bank_account'],checkConnection:async(connection)=>({account_number:connection.account_number,currency_code:'KES',method:'isolated_contract_test'}),
    retrieveTransactions:async()=>({entries:[],complete:true})};
  registry.register({code:'test_bank',name:'Isolated test bank',description:'Test only',channel_kinds:['bank_account'],connection_modes:['statement'],credential_fields:[]},adapter);
  assert.deepEqual(registry.definition('test_bank').connection_modes,['statement','bank_api']);
  assert.deepEqual(registry.capabilities('test_bank'),['connection_check','transaction_retrieval']);
  assert.equal(registry.adapter('test_bank'),adapter);
  assert.equal((await registry.adapter('test_bank').checkConnection({school_id:'school-b',revision_id:'b',account_number:'account-b',environment:'sandbox',credentials:{}})).account_number,'account-b');
  registry.register({code:'another_bank',name:'Other test bank',description:'Test only',channel_kinds:['bank_account'],connection_modes:['statement'],credential_fields:[]});
  registry.remove('test_bank');
  assert.throws(()=>registry.adapter('test_bank'),/not registered/);
  assert.equal(registry.definition('another_bank').code,'another_bank');
});
test('unsupported protocols and duplicate/mismatched registrations cannot advertise live capability',()=>{
  const registry=new BankProviderRegistry();
  const definition={code:'test_bank',name:'Test',description:'Test',channel_kinds:['bank_account'],connection_modes:['statement'],credential_fields:[]};
  registry.register(definition);
  assert.throws(()=>registry.adapter('test_bank'),/not implemented/);
  assert.throws(()=>registry.register(definition),/already registered/);
  assert.throws(()=>new BankProviderRegistry().register({...definition,connection_modes:['bank_api']}),/implemented adapter/);
  assert.throws(()=>new BankProviderRegistry().register(definition,{provider:'different_bank'} as never),/match/);
});
