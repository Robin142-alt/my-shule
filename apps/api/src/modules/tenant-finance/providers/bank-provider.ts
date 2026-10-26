import type { CollectionPaymentInput } from '../../payments/collection-payment.types';

export interface BankConnection {
  school_id:string;
  revision_id:string;
  environment:'sandbox'|'production';
  account_number:string;
  credentials:Record<string,string>;
}
export interface BankTransaction {
  direction:'credit'|'debit';
  payment:CollectionPaymentInput;
  evidence:{method:string;bank_reference:string;serial?:string;transaction_id?:string;description?:string;retrieved_at:string};
}
export interface BankRetrieval {
  entries:BankTransaction[];
  complete:boolean;
  warning?:string;
}
export interface BankTransactionDiagnostic {
  reference:string;
  status:'settled'|'failed'|'pending';
  amount_minor:string;
  account_bound:false;
}
/** A provider implements only its supported protocols. No adapter may post ledger entries. */
export interface BankProviderAdapter {
  readonly provider:string;
  readonly calendar_time_zone?:string;
  readonly connection_check?:'request'|'signed_notification';
  readonly channel_kinds:readonly ('bank_account'|'bank_paybill')[];
  checkConnection(connection:BankConnection):Promise<{account_number:string;currency_code:string;method:string}>;
  retrieveTransactions?(connection:BankConnection,range:{from_date:string;to_date:string}):Promise<BankRetrieval>;
  queryTransaction?(connection:BankConnection,reference:string):Promise<BankTransactionDiagnostic>;
  notifications?:{
    authenticate(connection:BankConnection,raw:Buffer,headers:Record<string,string|undefined>):void;
    parse(connection:BankConnection,payload:unknown):BankTransaction[];
    acknowledge(payload:unknown):Record<string,unknown>;
  };
}
export type BankErrorCategory='authentication'|'permission'|'rate_limit'|'unavailable'|'invalid_configuration'|'invalid_evidence';
export class BankProviderError extends Error {
  constructor(readonly category:BankErrorCategory,message:string){super(message);this.name='BankProviderError';}
  get retryable(){return this.category==='rate_limit'||this.category==='unavailable';}
}
