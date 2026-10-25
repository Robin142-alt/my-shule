import test from 'node:test';
import assert from 'node:assert/strict';
import { COLLECTION_PROVIDERS, collectionProvider } from './payment-provider.catalog';

test('all eleven banks are independently selectable and identify their official evidence',()=>{
  for(const code of ['equity','kcb','coop','nbk','family','absa','ncba','im','dtb','stanbic','standard_chartered']) {
    const provider=collectionProvider(code);
    assert.equal(provider.code,code);
    assert.ok(provider.assessment?.sources.length);
    assert.ok(provider.assessment?.onboarding);
    assert.equal(provider.assessment?.live_verification,'pending');
  }
  assert.equal(new Set(COLLECTION_PROVIDERS.map(p=>p.code)).size,COLLECTION_PROVIDERS.length);
});

test('NBK remains distinct from KCB and unavailable protocols cannot be activated',()=>{
  const nbk=collectionProvider('nbk');
  assert.match(nbk.assessment!.restriction,/Access/i);
  assert.deepEqual(nbk.connection_modes,['statement']);
  assert.throws(()=>collectionProvider('unregistered_bank'),/supported payment provider/);
});
