import { createHash, randomBytes } from 'node:crypto';
import { BankProviderError, type BankConnection, type BankProviderAdapter, type BankRetrieval, type BankTransaction } from './bank-provider';
import { parseBankJson } from './bank-json';

const HOST='https://openapi-sandbox.co-opbank.co.ke';
const MAX_BYTES=4*1024*1024;
const MAX_ENTRIES=10000;

/** Published Co-op Connect 1.0.0 sandbox contract. Production transport,
 * token renewal and currency/settlement guarantees require bank onboarding.
 * No production endpoint is inferred from the sandbox or legacy portal.
 */
export class CoopConnectAdapter implements BankProviderAdapter {
  readonly provider='coop';
  readonly channel_kinds=['bank_account'] as const;
  readonly calendar_time_zone='Africa/Nairobi';
  readonly environments=['sandbox'] as const;
  constructor(private readonly fetcher:typeof fetch=(input,init)=>fetch(input,init)){}

  async checkConnection(connection:BankConnection) {
    await this.request(connection,'Validation',{});
    const day=nairobiDay(new Date());
    await this.statement(connection,{from_date:day,to_date:day});
    return {account_number:connection.account_number,currency_code:'KES',method:'coop_sandbox_account_statement'};
  }
  async retrieveTransactions(connection:BankConnection,range:{from_date:string;to_date:string}):Promise<BankRetrieval> {
    const data=await this.statement(connection,range), ids=new Set<string>(),retrievedAt=new Date().toISOString();
    const entries=data.map((value:unknown):BankTransaction=>{
      const row=object(value),id=text(row.TransactionId,100,'posting identifier'),reference=text(row.TransactionReference,100,'bank reference');
      if(ids.has(id)) throw invalid('Co-op returned duplicate posting identifiers');
      ids.add(id);
      if(row.TransactionType!=='C'&&row.TransactionType!=='D') throw invalid('Co-op did not confirm credit/debit direction');
      const credit=minor(row.CreditAmount),debit=minor(row.DebitAmount);
      if((row.TransactionType==='C'&&(credit<=0n||debit!==0n))||(row.TransactionType==='D'&&(debit<=0n||credit!==0n)))
        throw invalid('Co-op posting amount conflicts with its direction');
      const occurred=timestamp(row.TransactionDate),day=nairobiDay(new Date(occurred));
      if(day<range.from_date||day>range.to_date) throw invalid('Co-op posting date is outside the requested statement');
      const narration=typeof row.Narration==='string'?row.Narration.trim():'';
      return {direction:row.TransactionType==='C'?'credit':'debit',payment:{
        provider_code:this.provider,provider_transaction_id:`COOP-${createHash('sha256').update(JSON.stringify([connection.account_number,id])).digest('hex').toUpperCase()}`,
        destination_account:connection.account_number,amount_minor:(row.TransactionType==='C'?credit:debit).toString(),
        currency_code:'KES',account_reference:narration.length<=120?narration:'',occurred_at:occurred},
        evidence:{method:'coop_sandbox_full_statement',bank_reference:reference,transaction_id:id,description:narration.slice(0,1000),retrieved_at:retrievedAt}};
    });
    const complete=entries.length<MAX_ENTRIES;
    return {entries,complete,...(!complete?{warning:'Co-op statement reached the safety limit; confirm completeness with the bank before advancing.'}:{})};
  }
  private async statement(connection:BankConnection,range:{from_date:string;to_date:string}) {
    day(range.from_date);day(range.to_date);
    if(range.from_date>range.to_date||Date.parse(range.to_date)-Date.parse(range.from_date)>31*86400000)
      throw invalid('Retrieve no more than 31 days in chronological order');
    const result=await this.request(connection,'FullStatement',{StartDate:range.from_date,EndDate:range.to_date});
    if(result.AccountNumber!==connection.account_number) throw invalid('Co-op statement account does not match the approved school account');
    if(!Array.isArray(result.Transactions)||result.Transactions.length>MAX_ENTRIES) throw invalid('Co-op statement list is missing or exceeds the safety limit');
    return result.Transactions as unknown[];
  }
  private async request(connection:BankConnection,operation:'Validation'|'FullStatement',body:Record<string,string>) {
    if(connection.environment!=='sandbox') throw new BankProviderError('invalid_configuration','Co-op direct integration currently supports sandbox only; use reviewed statements for live accounts');
    if(!/^\d{14}$/.test(connection.account_number)||connection.credentials.account_currency!=='KES')
      throw new BankProviderError('invalid_configuration','Provide the bank-authorized 14-digit sandbox KES account');
    const token=connection.credentials.access_token;
    if(!token||token.length>8192||!/^[A-Za-z0-9._~+/-]+=*$/.test(token))
      throw new BankProviderError('invalid_configuration','Provide a valid authorized Co-op sandbox access token');
    const reference=randomBytes(13).toString('hex');
    try {
      const response=await this.fetcher(`${HOST}/Enquiry/${operation}/Account/1.0.0/`,{method:'POST',
        headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify({MessageReference:reference,AccountNumber:connection.account_number,...body}),redirect:'error',signal:AbortSignal.timeout(20000)});
      if(!response.ok) {
        const category=response.status===401?'authentication':response.status===403?'permission':response.status===429?'rate_limit':response.status>=500?'unavailable':'invalid_evidence';
        throw new BankProviderError(category,`Co-op ${category.replaceAll('_',' ')} (HTTP ${response.status}); check the subscribed account and access token`);
      }
      if(Number(response.headers.get('content-length')??0)>MAX_BYTES) throw invalid('Co-op response exceeds the safety limit');
      const reader=response.body?.getReader();
      if(!reader) throw invalid('Co-op returned an empty response');
      const chunks:Uint8Array[]=[];let size=0;
      try {for(;;){const next=await reader.read();if(next.done) break;size+=next.value.byteLength;
        if(size>MAX_BYTES){await reader.cancel();throw invalid('Co-op response exceeds the safety limit');}chunks.push(next.value);}
      } finally {reader.releaseLock();}
      const result=object(parseBankJson(Buffer.concat(chunks).toString('utf8'),['CreditAmount','DebitAmount']));
      if(result.MessageReference!==reference) throw invalid('Co-op response does not match the account request');
      if(result.MessageCode!=='0') throw invalid('Co-op did not confirm a successful account response');
      return result;
    } catch(error) {
      if(error instanceof BankProviderError) throw error;
      if(error instanceof SyntaxError) throw invalid('Co-op returned malformed JSON');
      throw new BankProviderError('unavailable','Co-op could not be reached securely; retry after checking provider availability');
    }
  }
}
function invalid(message:string){return new BankProviderError('invalid_evidence',message);}
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw invalid('Co-op returned an invalid record');return value as Record<string,unknown>;}
function text(value:unknown,max:number,label:string){if(typeof value!=='string'||!value.trim()||value.length>max||/[\x00-\x1f]/.test(value)) throw invalid(`Invalid Co-op ${label}`);return value.trim();}
function minor(value:unknown) {
  if(typeof value!=='string'||!/^\d{1,17}(?:\.\d{1,2})?$/.test(value)) throw invalid('Co-op amount has invalid minor-unit precision');
  const [units,fraction='']=value.split('.'),amount=BigInt(units)*100n+BigInt(fraction.padEnd(2,'0'));
  if(amount>9223372036854775807n) throw invalid('Co-op amount exceeds supported precision');
  return amount;
}
function day(value:string) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)
    throw invalid('Invalid Co-op statement date');
}
function nairobiDay(value:Date){return new Date(value.getTime()+10800000).toISOString().slice(0,10);}
function timestamp(value:unknown) {
  const source=text(value,40,'posting timestamp');
  const match=/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.exec(source);
  if(!match||Number(match[2])>23||Number(match[3])>59||Number(match[4])>59) throw invalid('Invalid Co-op posting timestamp');
  day(match[1]);const parsed=new Date(source);
  if(!Number.isFinite(parsed.getTime())||parsed.getTime()>Date.now()+300000) throw invalid('Invalid Co-op posting timestamp');
  return parsed.toISOString();
}
