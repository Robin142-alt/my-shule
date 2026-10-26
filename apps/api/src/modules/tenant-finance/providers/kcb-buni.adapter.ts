import { constants, createPublicKey, verify } from 'node:crypto';
import { BankProviderError, type BankConnection, type BankProviderAdapter, type BankTransaction } from './bank-provider';

/** KCB Buni account IPN contract: a signed notification sent after account credit.
 * Official account spec and OpenAPI reviewed 2026-10-26. Till and validation
 * payloads are distinct contracts and cannot be interpreted as account credits.
 */
export class KcbBuniAdapter implements BankProviderAdapter {
  readonly provider='kcb';
  readonly channel_kinds=['bank_account'] as const;
  readonly calendar_time_zone='Africa/Nairobi';
  readonly connection_check='signed_notification' as const;

  async checkConnection(_connection:BankConnection):Promise<{account_number:string;currency_code:string;method:string}> {
    throw new BankProviderError('invalid_configuration','A recent bank-signed account notification is required to verify this connection');
  }

  readonly notifications={
    authenticate:(connection:BankConnection,raw:Buffer,headers:Record<string,string|undefined>)=>{
      const signature=headers.signature;
      if(!signature || !/^[A-Za-z0-9+/]+={0,2}$/.test(signature) || signature.length>4096 || raw.length>65536)
        throw new BankProviderError('authentication','Invalid KCB notification signature');
      let key:ReturnType<typeof createPublicKey>;
      try {
        key=createPublicKey(connection.credentials.bank_public_key);
        if(key.asymmetricKeyType!=='rsa'||(key.asymmetricKeyDetails?.modulusLength ?? 0)<2048) throw Error('Invalid key');
      } catch {throw new BankProviderError('invalid_configuration','Configure the bank-issued KCB RSA verification key of at least 2048 bits');}
      const bytes=Buffer.from(signature,'base64');
      if(bytes.toString('base64')!==signature || !verify('RSA-SHA256',raw,{key,padding:constants.RSA_PKCS1_PADDING},bytes))
        throw new BankProviderError('authentication','Invalid KCB notification signature');
    },
    parse:(connection:BankConnection,payload:unknown):BankTransaction[]=>{
      const row=object(payload);
      const account=text(row.creditAccountIdentifier,100,'receiving account');
      if(account!==connection.account_number) throw invalid('KCB receiving account does not match the approved school account');
      if(row.currency!=='KES') throw invalid('KCB notification currency is not KES');
      const reference=text(row.transactionReference,100,'transaction reference');
      const request=text(row.requestId,100,'request identifier');
      const occurred=timestamp(row.timestamp);
      const student=typeof row.customerReference==='string'?row.customerReference.trim():'';
      if(student.length>120) throw invalid('Invalid KCB student reference');
      if(typeof row.transactionAmount!=='string' || !/^\d{1,17}(?:\.\d{1,2})?$/.test(row.transactionAmount))
        throw invalid('KCB amount must be an exact positive decimal string');
      const [units,fraction='']=row.transactionAmount.split('.');
      const amount=BigInt(units)*100n+BigInt(fraction.padEnd(2,'0'));
      if(amount<=0n||amount>9223372036854775807n) throw invalid('KCB amount is outside the supported range');
      return [{direction:'credit',payment:{provider_code:'kcb',provider_transaction_id:reference,destination_account:account,
        amount_minor:amount.toString(),currency_code:'KES',account_reference:student,occurred_at:occurred},
        evidence:{method:'kcb_rsa_account_credit',bank_reference:reference,transaction_id:request,retrieved_at:new Date().toISOString()}}];
    },
    acknowledge:(payload:unknown)=>({transactionID:text(object(payload).requestId,100,'request identifier'),statusCode:'0',statusMessage:'Notification received'}),
  };
}

function invalid(message:string){return new BankProviderError('invalid_evidence',message);}
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw invalid('Invalid KCB account notification');return value as Record<string,unknown>;}
function text(value:unknown,max:number,label:string){if(typeof value!=='string'||!value.trim()||value.length>max||/[\x00-\x1f]/.test(value))throw invalid(`Invalid KCB ${label}`);return value.trim();}
function timestamp(value:unknown) {
  const source=text(value,40,'timestamp');
  // The OpenAPI example has minute precision. Reject the inconsistent 13-digit
  // PDF example instead of guessing a missing minute/second digit.
  const match=/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?$/.exec(source);
  if(!match) throw invalid('KCB timestamp requires YYYYMMDDHHmm or YYYYMMDDHHmmss; confirm the bank delivery format');
  const day=`${match[1]}-${match[2]}-${match[3]}`;
  const date=new Date(`${day}T${match[4]}:${match[5]}:${match[6] ?? '00'}+03:00`);
  if(!Number.isFinite(date.getTime()) || new Date(Date.parse(day)).toISOString().slice(0,10)!==day ||
    Number(match[4])>23||Number(match[5])>59||Number(match[6] ?? 0)>59||date.getTime()>Date.now()+300000)
    throw invalid('Invalid KCB posting timestamp');
  return date.toISOString();
}
