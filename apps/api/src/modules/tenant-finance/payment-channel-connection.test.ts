import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { PaymentChannelConnectionService } from './payment-channel-connection.service';
import { PaymentIngressConfigService } from './payment-ingress-config.service';
import type { PaymentChannelRevision } from './payment-channel-workflow.types';

const credentials = {consumer_key:'test-consumer-key',consumer_secret:'test-consumer-secret',
  _callback_token:'a'.repeat(64),_callback_trust_mode:'daraja_direct'};
const config={get:()=> 'https://pay.myshule.online/api/payments/ingress'};
const service=new PaymentChannelConnectionService(config as never,new PaymentIngressConfigService(config as never));
const revision={id:'12345678-1234-4123-8123-123456789abc',tenant_id:'mpesa-school',provider_code:'safaricom',
  connection_mode:'daraja',account_number:'600000',environment:'sandbox'} as PaymentChannelRevision;

for(const environment of ['sandbox','production'] as const) {
  test(`${environment} registers v2 C2B callbacks without an STK passkey`,async t=>{
    const requests:{url:string;init?:RequestInit}[]=[];
    t.mock.method(globalThis,'fetch',async (url:string,init?:RequestInit)=>{
      requests.push({url,init});return Response.json(url.includes('/oauth/')?{access_token:'provider-token'}:{ResponseCode:'0',ResponseDescription:'Success'});
    });
    assert.equal(await service.test({...revision,environment},credentials),'provider_registration_accepted');
    assert.equal(requests[1].url,`https://${environment==='production'?'api':'sandbox'}.safaricom.co.ke/mpesa/c2b/v2/registerurl`);
    const body=JSON.parse(String(requests[1].init?.body));
    assert.equal(body.ResponseType,'Completed');assert.equal(body.ShortCode,'600000');
    assert.match(body.ConfirmationURL,/\/c2b\//);assert.doesNotMatch(body.ConfirmationURL,/mpesa|safaricom/i);
    assert.equal(requests[1].init?.redirect,'error');
  });
}

test('failed checks expose bounded safe provider diagnostics, never credentials or callback capabilities',async t=>{
  let response:Response;
  t.mock.method(globalThis,'fetch',async (url:string)=>url.includes('/oauth/')?Response.json({access_token:'provider-token'}):response);
  for(const [body,status,expected] of [
    [{ResponseCode:'1',ResponseDescription:'Invalid Validation URL'},200,/ResponseCode=1; ResponseDescription=Invalid Validation URL/],
    [{errorCode:'500.003.1001',errorMessage:'Validation and Confirmation URLs are already registered'},500,/errorCode=500\.003\.1001; errorMessage=Validation and Confirmation URLs are already registered/],
    [{ResponseCode:'2',ResponseDescription:`Rejected https://pay.example.com/${credentials._callback_token} ${credentials.consumer_secret} provider-token\n<script>bad</script>`},400,/ResponseCode=2/],
    [{ResponseCode:{secret:'unsafe'},ResponseDescription:{raw:'unsafe'}},502,/HTTP 502/],
    [{ResponseCode:[0],ResponseDescription:'Malformed provider response'},200,/HTTP 200/],
    [{ResponseCode:'3',ResponseDescription:'Invalid URL '.repeat(1000)},400,/ResponseCode=3/],
    [null,502,/HTTP 502/],
  ] as const) {
    response=Response.json(body,{status});
    await assert.rejects(service.test(revision,credentials),(error:Error)=>{
      assert.match(error.message,expected);
      for(const secret of [credentials._callback_token,credentials.consumer_secret,'provider-token','https://','<script>','\n'])assert(!error.message.includes(secret));
      assert(error.message.length<650);return true;
    });
  }
  response=new Response('<html>Proxy error</html>',{status:502});
  await assert.rejects(service.test(revision,credentials),/HTTP 502/);
});

test('authentication failures expose safe provider errors without attempting registration',async t=>{
  const fetch=t.mock.method(globalThis,'fetch',async()=>Response.json({errorCode:'400.003.01',errorMessage:'Invalid Access Token'},{status:401}));
  await assert.rejects(service.test(revision,credentials),/HTTP 401.*errorCode=400\.003\.01; errorMessage=Invalid Access Token/);
  assert.equal(fetch.mock.callCount(),1);
});

test('invalid callback configuration fails before sending provider credentials',async t=>{
  const fetch=t.mock.method(globalThis,'fetch',async()=>{throw new Error('Must not call provider');});
  const invalid={get:()=> 'https://mpesa.example.com/payments/ingress'};
  const connection=new PaymentChannelConnectionService(invalid as never,new PaymentIngressConfigService(invalid as never));
  await assert.rejects(connection.test(revision,credentials),/callback.*address|callback.*URL/i);
  assert.equal(fetch.mock.callCount(),0);
});
