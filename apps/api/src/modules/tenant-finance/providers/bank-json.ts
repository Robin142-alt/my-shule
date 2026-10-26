import { BankProviderError } from './bank-provider';

/** Node 22's JSON source reviver preserves monetary tokens before IEEE-754 rounding.
 * Leave status codes/other JSON types unchanged. Each adapter names its money fields.
 */
export function parseBankJson(raw:string,moneyFields:readonly string[]):unknown {
  return JSON.parse(raw,(key:string,value:unknown,context?:{source?:string})=>{
    if(typeof value!=='number' || !moneyFields.includes(key)) return value;
    if(!context?.source)
      throw new BankProviderError('invalid_evidence','Exact bank monetary parsing is unavailable in this runtime');
    return context.source;
  });
}
