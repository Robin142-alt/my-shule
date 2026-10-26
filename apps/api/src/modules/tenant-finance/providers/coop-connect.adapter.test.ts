import assert from 'node:assert/strict';
import test from 'node:test';
import { CoopConnectAdapter } from './coop-connect.adapter';
import type { BankConnection } from './bank-provider';

const connection:BankConnection={school_id:'school-a',revision_id:'revision-a',environment:'sandbox',account_number:'00123456789012',
  credentials:{access_token:'authorized-sandbox-token',account_currency:'KES'}};
const entry={TransactionId:'posting-1',TransactionReference:'bank-ref-1',TransactionDate:'2026-10-01T10:00:00.000+03:00',
  ValueDate:'2026-10-01T10:00:00.000+03:00',TransactionType:'C',CreditAmount:123.45,DebitAmount:0,Narration:'ADM-1'};
const range={from_date:'2026-10-01',to_date:'2026-10-01'};
function transport(change:Record<string,unknown>={},rows:unknown[]=[entry],status=200){
  const requests:Array<{url:string;init:RequestInit;body:any}>=[];
  const adapter=new CoopConnectAdapter(async(url,init)=>{
    const body=JSON.parse(String(init?.body));requests.push({url:String(url),init:init!,body});
    return Response.json({MessageReference:body.MessageReference,MessageCode:'0',AccountNumber:connection.account_number,
      Transactions:rows,...change},{status});
  });
  return {adapter,requests};
}
test('Co-op performs the published authenticated validation and account-bound statement requests',async()=>{
  const f=transport();await f.adapter.checkConnection(connection);
  assert.equal(f.requests[0].url,'https://openapi-sandbox.co-opbank.co.ke/Enquiry/Validation/Account/1.0.0/');
  assert.equal(f.requests[1].url,'https://openapi-sandbox.co-opbank.co.ke/Enquiry/FullStatement/Account/1.0.0/');
  for(const request of f.requests) {
    assert.equal(new Headers(request.init.headers).get('Authorization'),'Bearer authorized-sandbox-token');
    assert.equal(request.body.AccountNumber,connection.account_number);assert.ok(request.body.MessageReference.length<=27);
    assert.equal(request.init.redirect,'error');
  }
});
test('Co-op preserves posting IDs, exact credit/debit amounts and never guesses from a long narration',async()=>{
  const f=transport({},[entry,{...entry,TransactionId:'posting-2',TransactionType:'D',CreditAmount:0,DebitAmount:50,Narration:'x'.repeat(121)}]);
  const result=await f.adapter.retrieveTransactions(connection,range);
  assert.equal(result.complete,true);assert.deepEqual(result.entries.map(item=>item.direction),['credit','debit']);
  assert.equal(result.entries[0].payment.amount_minor,'12345');assert.equal(result.entries[1].payment.amount_minor,'5000');
  assert.notEqual(result.entries[0].payment.provider_transaction_id,result.entries[1].payment.provider_transaction_id);
  assert.equal(result.entries[0].evidence.transaction_id,'posting-1');assert.equal(result.entries[1].payment.account_reference,'');
});
test('Co-op rejects production, unknown currency and malformed account configuration before transport',async()=>{
  const f=transport();
  for(const change of [{environment:'production'},{account_number:'123'}, {credentials:{access_token:'token',account_currency:'USD'}},
    {credentials:{access_token:'invalid\r\ntoken',account_currency:'KES'}}])
    await assert.rejects(f.adapter.retrieveTransactions({...connection,...change} as BankConnection,range));
  assert.equal(f.requests.length,0);
});
test('Co-op requires the echoed request, receiving account, successful outcome and valid date/direction',async()=>{
  for(const change of [{MessageReference:'other-request'},{AccountNumber:'other-account'},{MessageCode:'-8'}])
    await assert.rejects(transport(change).adapter.retrieveTransactions(connection,range));
  for(const change of [{TransactionType:'pending'},{DebitAmount:1},{CreditAmount:0},{TransactionId:''},
    {TransactionDate:'2026-02-30T10:00:00+03:00'},{TransactionDate:'2026-09-30T10:00:00+03:00'}])
    await assert.rejects(transport({},[{...entry,...change}]).adapter.retrieveTransactions(connection,range));
  await assert.rejects(transport({},[entry,entry]).adapter.retrieveTransactions(connection,range),/duplicate/i);
});
test('Co-op classifies failures without exposing credential or provider payloads',async()=>{
  for(const [status,category] of [[401,'authentication'],[403,'permission'],[429,'rate_limit'],[500,'unavailable']] as const)
    await assert.rejects(transport({MessageDescription:'authorized-sandbox-token private payer'},[],status).adapter.retrieveTransactions(connection,range),
      (error:any)=>{assert.equal(error.category,category);assert.doesNotMatch(error.message,/authorized-sandbox-token|private payer/);return true;});
  await assert.rejects(new CoopConnectAdapter(async()=>{throw Error('provider secret');}).retrieveTransactions(connection,range),/could not be reached/);
});
test('Co-op reads numeric JSON money losslessly and rejects excess fractional precision',async()=>{
  function adapter(amount:string){return new CoopConnectAdapter(async(_url,init)=>{
    const body=JSON.parse(String(init?.body));
    return new Response(JSON.stringify({MessageReference:body.MessageReference,MessageCode:'0',AccountNumber:connection.account_number,
      Transactions:[{...entry,CreditAmount:'RAW_AMOUNT'}]}).replace('"RAW_AMOUNT"',amount));
  });}
  assert.equal((await adapter('90071992547409.91').retrieveTransactions(connection,range)).entries[0].payment.amount_minor,'9007199254740991');
  await assert.rejects(adapter('1.00000000000000001').retrieveTransactions(connection,range),/precision/);
});
