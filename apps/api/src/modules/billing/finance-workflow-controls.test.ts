import assert from 'node:assert/strict';
import test from 'node:test';
import { AccountantCommandService } from '../admin-command/accountant-command.service';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { ManualFeePaymentService } from './manual-fee-payment.service';
import { RequestContextService } from '../../common/request-context/request-context.service';

const accountant = '11111111-1111-4111-8111-111111111111';
const principal = '22222222-2222-4222-8222-222222222222';
const context = new RequestContextService();
const as = <T>(role: string, work: () => T, tenant = 'school-a', user = role === 'principal' ? principal : accountant) => context.run({tenant_id:tenant,user_id:user,role,is_authenticated:true} as never,work);

test('expense retry returns the saved request without duplicate events and rejects changed payloads', async () => {
  let saved: any; let events = 0;
  const service = new AccountantCommandService(context, {
    withRequestTransaction: (work: () => unknown) => work(),
    executeWithTenant: (tenant: string, actor: string, work: (tx: unknown) => unknown) => {
      assert.equal(tenant,'school-a'); assert.equal(actor,accountant);
      return work({$queryRawUnsafe: async (sql: string, ...args: unknown[]) => {
        if (sql.includes('INSERT')) {
          if (saved) return [];
          saved={id:'expense',date:new Date(),category:args[1],description:args[2],amount_minor:args[3],requested_by:args[4],status:'pending'};
        }
        return [saved];
      }});
    },
  } as never, { recordWorkflowAction: async () => { events++; return {id:'event'}; }, notifyRoles: async () => {} } as never);
  const dto={category:'utilities',description:'School electricity',amount_minor:'10000',idempotency_key:'expense-one'};
  await as('accountant',()=>service.createExpense(dto));
  await as('accountant',()=>service.createExpense(dto));
  assert.equal(events,1);
  await assert.rejects(as('accountant',()=>service.createExpense({...dto,amount_minor:'20000'})),/different expense/);
});

test('expense decision denies non-Principal, self approval, foreign-school record and repeated decision', async () => {
  let row: any={id:'expense',status:'pending',requested_by:principal}; let writes=0;
  const service=new AccountantCommandService(context,{
    withRequestTransaction:(work:()=>unknown)=>work(),
    query:async(sql:string,args:unknown[])=>{ assert.equal(args[0],'school-a'); if(sql.includes('SELECT')) return {rows:row?[row]:[]}; writes++; return {rows:[]}; },
  } as never,{} as never);
  await assert.rejects(as('accountant',()=>service.decideExpense('expense','approve','Reviewed budget')),/Only the Principal/);
  await assert.rejects(as('principal',()=>service.decideExpense('expense','approve','Reviewed budget')),/different, identified/);
  row=null;
  await assert.rejects(as('principal',()=>service.decideExpense('expense','approve','Reviewed budget')),/not found in this school/);
  row={status:'approved',requested_by:accountant};
  await assert.rejects(as('principal',()=>service.decideExpense('expense','approve','Reviewed budget')),/already been decided/);
  assert.equal(writes,0);
});

test('manual and collection reversals cannot use the legacy endpoint without Principal approval', async () => {
  let ledgerWrites=0;
  const payment={id:'receipt',status:'cleared',metadata:{}};
  const service=new ManualFeePaymentService(context,{
    withRequestTransaction:(work:()=>unknown)=>work(),
    query:async()=>({rows:[{approved:false}]}),
  } as never,{lockById:async()=>payment} as never,{} as never,{} as never,{postTransaction:async()=>{ledgerWrites++;}} as never);
  for(const role of ['accountant','principal']) await assert.rejects(as(role,()=>service.reverseManualFeePayment('receipt',{})),/Principal/);
  assert.equal(ledgerWrites,0);
});

test('manual reversal decision refuses the requester and foreign-school records before posting', async () => {
  let row: any={payment_id:'receipt',status:'pending',requested_by:principal}; let writes=0;
  const service=new ManualFeePaymentService(context,{
    withRequestTransaction:(work:()=>unknown)=>work(),
    query:async(sql:string,args:unknown[])=>{assert.equal(args[0],'school-a');if(sql.startsWith('SELECT'))return {rows:row?[row]:[]};writes++;return {rows:[]};},
  } as never,{} as never,{} as never,{} as never,{} as never);
  await assert.rejects(as('principal',()=>service.decideReversal('request','approve','Duplicate entry')),/own reversal/);
  row=null;
  await assert.rejects(as('principal',()=>service.decideReversal('request','approve','Duplicate entry')),/not found in this school/);
  await assert.rejects(as('accountant',()=>service.decideReversal('request','approve','Duplicate entry')),/Only the Principal/);
  assert.equal(writes,0);
});

test('public manual receipt endpoint cannot forge verified M-Pesa or bank collections', async () => {
  const controller=new BillingController({} as never,{} as never,{} as never,{createManualFeePayment:()=>{throw Error('must not be reached');}} as never,{} as never);
  for(const payment_method of ['mpesa_c2b','bank_deposit','eft']) await assert.rejects(controller.createManualFeePayment({payment_method} as never),/verified collections/);
});

function invoiceService(query: (sql:string,args:unknown[])=>Promise<unknown>, saved?: any) {
  let writes=0;
  const service = new BillingService(context, { withRequestTransaction:(work:()=>unknown)=>work(),query } as never,
    {invalidateTenant:async()=>{}} as never,{} as never,{} as never,
    {lockCurrentByTenant:async()=>({id:'subscription',status:'active',currency_code:'KES'}),acquireTenantMutationLock:async()=>{}} as never,
    {findById:async()=>saved,createInvoice:async()=>{writes++;throw Error('unexpected write');}} as never);
  return {service,writes:()=>writes};
}

test('learner invoice rejects cross-school IDs before creating an invoice', async () => {
  const {service,writes}=invoiceService(async(sql,args)=>{assert.match(sql,/WHERE tenant_id=\$1/);assert.deepEqual(args,['school-a','foreign-student']);return {rows:[]};});
  await assert.rejects(as('accountant',()=>service.createInvoice({description:'Fees',total_amount_minor:'1000',metadata:{student_id:'foreign-student'}})),/not found in this school/);
  assert.equal(writes(),0);
});

test('invoice retry returns the same invoice and rejects a changed amount', async () => {
  const date=new Date('2026-10-01T10:00:00Z');
  const saved={id:'invoice',tenant_id:'school-a',description:'Fees',total_amount_minor:'1000',metadata:{student_id:'student'},issued_at:date,due_at:date,created_at:date,updated_at:date};
  const {service,writes}=invoiceService(async(sql)=>({rows:sql.includes('FROM students')?[{student_name:'Saved learner',admission_number:'001'}]:[{id:'invoice'}]}),saved);
  const dto={description:'Fees',total_amount_minor:'1000',idempotency_key:'same-submission',metadata:{student_id:'student'}};
  assert.equal((await as('accountant',()=>service.createInvoice(dto))).id,'invoice');
  await assert.rejects(as('accountant',()=>service.createInvoice({...dto,total_amount_minor:'2000'})),/different invoice/);
  assert.equal(writes(),0);
});
