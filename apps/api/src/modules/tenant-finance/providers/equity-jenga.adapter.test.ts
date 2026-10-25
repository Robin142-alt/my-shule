import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPairSync, verify } from 'node:crypto';
import { EquityJengaAdapter } from './equity-jenga.adapter';
import type { BankConnection } from './bank-provider';

const keys=generateKeyPairSync('rsa',{modulusLength:2048});
const connection:BankConnection={school_id:'school-a',revision_id:'revision-a',environment:'sandbox',account_number:'0012345678901',
  credentials:{merchant_code:'merchant-a',consumer_secret:'secret-a',api_key:'api-a',private_key:keys.privateKey.export({format:'pem',type:'pkcs8'}).toString()}};
const row={reference:'BANK-REFERENCE',serial:'1',transactionId:'TX-ID',date:'2026-10-01T10:00:00.000',postedDateTime:'2026-10-01T10:00:00.000',
  amount:'123.45',description:'ADM-001',type:'Credit'};
function transport(data:unknown,status=200){
  const requests:Array<{url:string;init:RequestInit}>=[];
  const fetcher:typeof fetch=async(url,init)=>{
    requests.push({url:String(url),init:init!});
    if(String(url).includes('/authenticate/')) return Response.json({accessToken:'token-a',tokenType:'Bearer',expiresIn:new Date(Date.now()+60000).toISOString()});
    return Response.json(data,{status});
  };
  return {adapter:new EquityJengaAdapter(fetcher),requests};
}
function statement(rows:unknown[]=[row],account=connection.account_number){return {status:true,code:0,data:{accountNumber:account,currency:'KES',balance:'1000',transactions:rows}};}

test('Jenga uses official hosts, merchant authentication and RSA-SHA256 account-bound statement signatures',async()=>{
  const f=transport(statement());
  const result=await f.adapter.retrieveTransactions(connection,{from_date:'2026-10-01',to_date:'2026-10-01'});
  assert.equal(f.requests[0].url,'https://uat.finserve.africa/authentication/api/v3/authenticate/merchant');
  assert.deepEqual(JSON.parse(String(f.requests[0].init.body)),{merchantCode:'merchant-a',consumerSecret:'secret-a'});
  assert.equal(new Headers(f.requests[0].init.headers).get('Api-Key'),'api-a');
  assert.equal(f.requests[1].url,'https://uat.finserve.africa/v3-apis/account-api/v3.0/accounts/fullStatement');
  assert.equal(f.requests[1].init.redirect,'error');
  assert.ok(verify('RSA-SHA256',Buffer.from(`${connection.account_number}KE2026-10-01`),keys.publicKey,
    Buffer.from(new Headers(f.requests[1].init.headers).get('Signature')!,'base64')));
  assert.equal(result.entries[0].payment.amount_minor,'12345');
  assert.equal(result.entries[0].payment.destination_account,connection.account_number);
  assert.equal(result.entries[0].payment.account_reference,'ADM-001');
  assert.equal(result.entries[0].payment.occurred_at,'2026-10-01T07:00:00.000Z');
  assert.equal(result.entries[0].evidence.bank_reference,'BANK-REFERENCE');
  assert.equal(result.complete,true);
});
test('statement identity includes serial and debit entries cannot become received payments',async()=>{
  const f=transport(statement([row,{...row,serial:'2',type:'Debit'}]));
  const result=await f.adapter.retrieveTransactions(connection,{from_date:'2026-10-01',to_date:'2026-10-01'});
  assert.notEqual(result.entries[0].payment.provider_transaction_id,result.entries[1].payment.provider_transaction_id);
  assert.deepEqual(result.entries.map(entry=>entry.direction),['credit','debit']);
});
test('receiving account and currency must match before any statement is trusted',async()=>{
  for(const body of [statement([row],'OTHER-ACCOUNT'),{...statement(),data:{...statement().data,currency:'USD'}}]) {
    await assert.rejects(transport(body).adapter.retrieveTransactions(connection,{from_date:'2026-10-01',to_date:'2026-10-01'}),/account|currency/i);
  }
});
test('rejects ambiguous, imprecise, incomplete and malformed transaction records',async()=>{
  for(const change of [{amount:'1.001'},{amount:9007199254740992},{serial:''},{type:'Pending'},{date:'2026-02-30T10:00:00.000',postedDateTime:'2026-02-30T10:00:00.000'}]) {
    await assert.rejects(transport(statement([{...row,...change}])).adapter.retrieveTransactions(connection,{from_date:'2026-10-01',to_date:'2026-10-01'}));
  }
  const saturated=await transport(statement(Array.from({length:1000},(_,n)=>({...row,serial:String(n+1)})))).adapter.retrieveTransactions(connection,{from_date:'2026-10-01',to_date:'2026-10-01'});
  assert.equal(saturated.complete,false);
  assert.match(saturated.warning!,/limit|continuation/i);
});
test('classifies authorization and transient failures without persisting provider secrets',async()=>{
  for(const [status,category] of [[401,'authentication'],[403,'permission'],[429,'rate_limit'],[503,'unavailable']] as const) {
    const f=transport({message:'secret-a token-a private payload'},status);
    await assert.rejects(f.adapter.retrieveTransactions(connection,{from_date:'2026-10-01',to_date:'2026-10-01'}),(error:any)=>{
      assert.equal(error.category,category);assert.doesNotMatch(error.message,/secret-a|token-a|private payload/);return true;
    });
  }
});
test('connection check performs an authenticated account statement request; production never uses the sandbox host',async()=>{
  const f=transport(statement([]));
  const result=await f.adapter.checkConnection({...connection,environment:'production'});
  assert.equal(result.account_number,connection.account_number);
  assert.equal(f.requests.length,2);
  assert.ok(f.requests.every(request=>request.url.startsWith('https://api.finserve.africa/')));
});
test('successful transaction detail is diagnostic only because the contract omits a verified receiving account',async()=>{
  const f=transport({status:true,code:0,data:{state:'Success',stateCode:2,amount:123.45,transactionReference:'BANK-REFERENCE',biller:'888880'}});
  const detail=await f.adapter.queryTransaction(connection,'BANK-REFERENCE');
  assert.equal(detail.status,'settled');
  assert.equal(detail.account_bound,false);
  assert.equal(new URL(f.requests[1].url).pathname,'/v3-apis/transaction-api/v3.0/transactions/details/BANK-REFERENCE');
});
