import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalPaymentBase, PaymentIngressConfigService } from '../../tenant-finance/payment-ingress-config.service';
import { SafaricomCollectionAdapter, safaricomMinor } from './safaricom-collection.adapter';
import { MpesaSignatureService } from '../services/mpesa-signature.service';
import { CollectionAdapterRegistry } from './collection-adapter-registry.service';
import { sanitizeRequestPath, isPaymentIngressCallback } from '../../../common/request-path.util';

test('canonical callbacks preserve exact public prefix and reject unsafe configuration',()=>{
  const config=new PaymentIngressConfigService({get:()=> 'https://pay.myshule.online/api/payments/ingress'} as never);
  const result=config.urls({id:'revision',tenant_id:'school-a',provider_code:'safaricom',environment:'sandbox'},'a'.repeat(64));
  assert.equal(result.confirmation_url,`https://pay.myshule.online/api/payments/ingress/safaricom/sandbox/school-a/revision/${'a'.repeat(64)}/confirmation`);
  for(const value of ['http://pay.myshule.online/payments/ingress','https://127.0.0.1/payments/ingress','https://pay.myshule.online/payments/ingress?x=1','https://pay.myshule.online/callback']) assert.throws(()=>canonicalPaymentBase(value));
  assert(!sanitizeRequestPath(result.confirmation_url).includes('a'.repeat(64)));
  assert(isPaymentIngressCallback('POST',new URL(result.confirmation_url).pathname));assert(!isPaymentIngressCallback('GET','/payments/ingress'));
});
test('direct channel works without invented provider HMAC; gateway channel requires valid HMAC',()=>{
  const signature=new MpesaSignatureService({get:(key:string)=>key==='mpesa.callbackSecret'?'test-secret':300} as never);
  const adapter=new SafaricomCollectionAdapter(signature), raw='{"test":1}', timestamp=new Date().toISOString();
  adapter.authenticate({credentials:{_callback_trust_mode:'daraja_direct'}} as never,raw,{});
  const channel={credentials:{_callback_trust_mode:'edge_signed'}} as never;
  assert.throws(()=>adapter.authenticate(channel,raw,{}));
  adapter.authenticate(channel,raw,{'x-mpesa-signature':signature.computeSignature(raw,timestamp),'x-mpesa-timestamp':timestamp});
  assert.throws(()=>adapter.authenticate(channel,raw+' ',{'x-mpesa-signature':signature.computeSignature(raw,timestamp),'x-mpesa-timestamp':timestamp}));
  assert.throws(()=>new CollectionAdapterRegistry(adapter).get('equity'),/statement/);
});
test('provider money and payload parsing is exact and validates dates',()=>{
  assert.equal(safaricomMinor('123.45'),'12345');
  for(const amount of ['-1','NaN','1e3','1.001'])assert.throws(()=>safaricomMinor(amount));
  const adapter=new SafaricomCollectionAdapter({} as never);
  assert.throws(()=>adapter.parse({TransID:'TEST',TransTime:'20260231000000',BusinessShortCode:'600000',TransAmount:'1'}));
  assert.throws(()=>adapter.parseVerification({Result:{ConversationID:'x',ResultCode:0,ResultParameters:{ResultParameter:[{Key:'Amount',Value:'1'},{Key:'Amount',Value:'2'}]}}}));
});
