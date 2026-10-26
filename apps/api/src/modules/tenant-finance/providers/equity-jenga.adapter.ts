import { constants, createHash, createPrivateKey, sign } from 'node:crypto';
import { BankProviderError, type BankConnection, type BankProviderAdapter, type BankRetrieval, type BankTransaction, type BankTransactionDiagnostic } from './bank-provider';
import { parseBankJson } from './bank-json';

const STATEMENT_PATH='/v3-apis/account-api/v3.0/accounts/fullStatement';
const STATEMENT_LIMIT=1000;
const MAX_RESPONSE_BYTES=4*1024*1024;

/** Official Jenga v3 merchant authentication, RSA-SHA256 statements and diagnostics.
 * Source: developer.jengahq.io, reviewed 2026-10-25. No money-moving API is called.
 */
export class EquityJengaAdapter implements BankProviderAdapter {
  readonly provider='equity';
  readonly calendar_time_zone='Africa/Nairobi';
  readonly channel_kinds=['bank_account'] as const;
  constructor(private readonly fetcher:typeof fetch=(input,init)=>fetch(input,init)){}

  async checkConnection(connection:BankConnection){
    const day=nairobiDay(new Date());
    await this.statement(connection,{from_date:day,to_date:day},1);
    return {account_number:connection.account_number,currency_code:'KES',method:'jenga_account_statement'};
  }

  async retrieveTransactions(connection:BankConnection,range:{from_date:string;to_date:string}):Promise<BankRetrieval>{
    const data=await this.statement(connection,range,STATEMENT_LIMIT);
    const retrievedAt=new Date().toISOString();
    const entries=data.transactions.map((value:unknown):BankTransaction=>{
      const row=object(value);
      const reference=requiredText(row.reference,100,'transaction reference');
      const serial=requiredText(row.serial,100,'transaction serial');
      if(row.type!=='Credit'&&row.type!=='Debit') throw invalid('Statement entry has no supported credit/debit direction');
      const description=typeof row.description==='string'?row.description.trim():'';
      const occurred=bankDate(row.postedDateTime ?? row.date);
      const day=nairobiDay(new Date(occurred));
      if(day<range.from_date||day>range.to_date) throw invalid('Statement entry lies outside the requested date range');
      return {
        direction:row.type==='Credit'?'credit':'debit',
        payment:{provider_code:this.provider,
          // Bank examples reuse transactionId/reference for both sides of a posting.
          // Preserve the full reference/serial separately; hash only the stable identity.
          provider_transaction_id:`JENGA-${createHash('sha256').update(JSON.stringify([connection.account_number,reference,serial])).digest('hex').toUpperCase()}`,
          destination_account:connection.account_number,amount_minor:minorAmount(row.amount),currency_code:'KES',
          // No fuzzy extraction from narration. Only exact school references can match.
          account_reference:description.length<=120?description:'',occurred_at:occurred},
        evidence:{method:'jenga_account_statement',bank_reference:reference,serial,
          ...(typeof row.transactionId==='string'?{transaction_id:row.transactionId.slice(0,100)}:{}),description:description.slice(0,1000),retrieved_at:retrievedAt},
      };
    });
    const complete=entries.length<STATEMENT_LIMIT;
    return {entries,complete,...(!complete?{warning:'The statement reached its limit. Bank continuation confirmation or a reviewed statement is required; this date remains incomplete.'}:{})};
  }

  async queryTransaction(connection:BankConnection,reference:string):Promise<BankTransactionDiagnostic>{
    requiredText(reference,100,'transaction reference');
    const token=await this.authenticate(connection);
    const response=await this.request(connection,`/v3-apis/transaction-api/v3.0/transactions/details/${encodeURIComponent(reference)}`,{
      method:'GET',headers:{Authorization:`Bearer ${token}`,Signature:this.signature(connection,reference)},
    });
    const data=this.successData(response);
    if(data.transactionReference!==reference) throw invalid('Transaction query returned a different reference');
    return {reference,amount_minor:minorAmount(data.amount),account_bound:false,
      status:data.stateCode===2&&data.state==='Success'?'settled':data.stateCode===1&&data.state==='Failed'?'failed':'pending'};
  }

  private async statement(connection:BankConnection,range:{from_date:string;to_date:string},limit:number){
    validateDay(range.from_date);validateDay(range.to_date);
    if(range.from_date>range.to_date || (Date.parse(range.to_date)-Date.parse(range.from_date))>31*86400000)
      throw new BankProviderError('invalid_configuration','Retrieve at most 31 days in chronological order');
    this.validateConnection(connection);
    const token=await this.authenticate(connection);
    const response=await this.request(connection,STATEMENT_PATH,{method:'POST',
      headers:{Authorization:`Bearer ${token}`,Signature:this.signature(connection,`${connection.account_number}KE${range.to_date}`)},
      body:JSON.stringify({countryCode:'KE',accountNumber:connection.account_number,fromDate:range.from_date,toDate:range.to_date,limit})});
    const data=this.successData(response);
    if(data.accountNumber!==connection.account_number) throw invalid('Statement receiving account does not match the approved school account');
    if(data.currency!=='KES') throw invalid('Statement currency is not the approved KES currency');
    if(!Array.isArray(data.transactions)||data.transactions.length>limit) throw invalid('Statement transaction list is missing or exceeds the requested limit');
    return {transactions:data.transactions as unknown[]};
  }

  private validateConnection(connection:BankConnection){
    if(!['sandbox','production'].includes(connection.environment)||!/^\d{6,30}$/.test(connection.account_number))
      throw new BankProviderError('invalid_configuration','Provide the authorized Equity account and environment');
    for(const key of ['merchant_code','consumer_secret','api_key','private_key']) {
      if(typeof connection.credentials[key]!=='string'||!connection.credentials[key].trim()||connection.credentials[key].length>8192)
        throw new BankProviderError('invalid_configuration',`Missing or invalid Jenga ${key.replaceAll('_',' ')}`);
    }
  }
  private signature(connection:BankConnection,message:string){
    try {
      const key=createPrivateKey(connection.credentials.private_key);
      if(key.asymmetricKeyType!=='rsa'||(key.asymmetricKeyDetails?.modulusLength??0)<2048) throw Error('Invalid key');
      return sign('RSA-SHA256',Buffer.from(message),{key,padding:constants.RSA_PKCS1_PADDING}).toString('base64');
    } catch { throw new BankProviderError('invalid_configuration','Provide a valid RSA private key of at least 2048 bits registered with Jenga'); }
  }
  private async authenticate(connection:BankConnection){
    this.validateConnection(connection);
    const response=await this.request(connection,'/authentication/api/v3/authenticate/merchant',{method:'POST',
      headers:{'Api-Key':connection.credentials.api_key},body:JSON.stringify({merchantCode:connection.credentials.merchant_code,consumerSecret:connection.credentials.consumer_secret})});
    const token=response.accessToken;
    if(typeof token!=='string'||!token||token.length>16384||/[\r\n]/.test(token)||response.tokenType!=='Bearer'
      ||!Number.isFinite(Date.parse(String(response.expiresIn)))||Date.parse(String(response.expiresIn))<=Date.now())
      throw new BankProviderError('authentication','Jenga did not return a valid unexpired merchant token');
    return token;
  }
  private successData(response:Record<string,unknown>){
    if(response.status!==true||response.code!==0) throw invalid('Jenga did not confirm a successful account response');
    return object(response.data);
  }
  private async request(connection:BankConnection,path:string,init:RequestInit):Promise<Record<string,unknown>>{
    const host=connection.environment==='sandbox'?'https://uat.finserve.africa':'https://api.finserve.africa';
    try {
      const response=await this.fetcher(`${host}${path}`,{...init,headers:{'Content-Type':'application/json',Accept:'application/json',...init.headers},
        redirect:'error',signal:AbortSignal.timeout(20000)});
      if(!response.ok) {
        const category=response.status===401?'authentication':response.status===403?'permission':response.status===429?'rate_limit':response.status>=500?'unavailable':'invalid_evidence';
        throw new BankProviderError(category,`Jenga ${category.replaceAll('_',' ')} (HTTP ${response.status}); check account entitlement or retry when the bank recovers`);
      }
      if(Number(response.headers.get('content-length')??0)>MAX_RESPONSE_BYTES) throw invalid('Jenga response exceeds the supported size');
      const reader=response.body?.getReader();
      if(!reader) throw invalid('Jenga returned an empty response');
      const chunks:Uint8Array[]=[];let size=0;
      try { for(;;){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;
        if(size>MAX_RESPONSE_BYTES) {await reader.cancel();throw invalid('Jenga response exceeds the supported size');}chunks.push(next.value);}
      } finally { reader.releaseLock(); }
      try {return object(parseBankJson(Buffer.concat(chunks).toString('utf8'),['amount']));} catch(error){if(error instanceof BankProviderError)throw error;throw invalid('Jenga returned malformed JSON');}
    } catch(error) {
      if(error instanceof BankProviderError) throw error;
      throw new BankProviderError('unavailable','Jenga could not be reached securely; retry after checking provider availability');
    }
  }
}
function invalid(message:string){return new BankProviderError('invalid_evidence',message);}
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw invalid('Jenga returned an invalid object');return value as Record<string,unknown>;}
function requiredText(value:unknown,max:number,label:string){if(typeof value!=='string'||!value.trim()||value.length>max||/[\x00-\x1f]/.test(value))throw invalid(`Invalid ${label}`);return value.trim();}
function minorAmount(value:unknown){
  if(typeof value!=='string') throw invalid('Invalid transaction amount');
  const match=/^(\d{1,17})(?:\.(\d{1,2}))?$/.exec(value);
  if(!match) throw invalid('Transaction amount must have exact positive minor-unit precision');
  const amount=BigInt(match[1])*100n+BigInt((match[2]??'').padEnd(2,'0'));
  if(amount<=0n||amount>9223372036854775807n)
    throw invalid('Transaction amount exceeds safe monetary precision');
  return amount.toString();
}
function validateDay(day:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day)
  throw new BankProviderError('invalid_configuration','Statement dates must be valid YYYY-MM-DD dates');}
function nairobiDay(date:Date){return new Date(date.getTime()+3*3600000).toISOString().slice(0,10);}
function bankDate(value:unknown){
  const text=requiredText(value,40,'posting timestamp');
  const match=/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2}):(\d{2})(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})?$/.exec(text);
  if(!match||Number(match[2])>23||Number(match[3])>59||Number(match[4])>59) throw invalid('Invalid posting timestamp');
  validateDay(match[1]);
  // This adapter is restricted to Kenyan KES accounts; zone-less bank dates are EAT.
  const parsed=new Date(`${match[1]}T${match[2]}:${match[3]}:${match[4]}${match[5]??''}${match[6]??'+03:00'}`);
  if(!Number.isFinite(parsed.getTime())||parsed.getTime()>Date.now()+300000) throw invalid('Invalid posting timestamp');
  return parsed.toISOString();
}
