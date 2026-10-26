import assert from 'node:assert/strict';
import test from 'node:test';
import { FinanceBillingAliasesController } from './finance-billing-aliases.controller';

test('legacy invoice URL uses the canonical billing roster and engine, retaining its response shape',async()=>{
  const controller=new FinanceBillingAliasesController({
    listFeeStructures:async()=>[{id:'plan',term:'Term 1',academic_year:'2026'}],
    listBillableStudentsForFeeStructure:async()=>[{student_id:'learner',student_name:'Amina',class_name:null,guardian_phone:null,admission_number:'ADM1'}],
    bulkGenerateFeeInvoices:async(input:any)=>{
      assert.equal(input.fee_structure_id,'plan');assert.equal(input.idempotency_key,'finance-route:plan');
      assert.deepEqual(input.target_students,[{student_id:'learner',student_name:'Amina',class_name:undefined,guardian_phone:undefined,admission_number:'ADM1'}]);
      return {generated_count:1,invoices:[{id:'invoice'}],skipped:[]};
    },
  } as never);
  assert.deepEqual(await controller.generateInvoices({fee_structure_id:'plan'}),{generated:1,invoices:[{id:'invoice'}],skipped:[]});
  await assert.rejects(()=>controller.generateInvoices({fee_structure_id:'foreign'}),/this school/);
  await assert.rejects(()=>controller.generateInvoices({fee_structure_id:'plan',academic_year:'2025'}),/configured/);
});

test('legacy invoice URL does not fabricate invoices when the active roster is empty',async()=>{
  const controller=new FinanceBillingAliasesController({
    listFeeStructures:async()=>[{id:'plan',term:'Term 1',academic_year:'2026'}],
    listBillableStudentsForFeeStructure:async()=>[],
    bulkGenerateFeeInvoices:async()=>assert.fail('No invoice should be created'),
  } as never);
  assert.deepEqual(await controller.generateInvoices({fee_structure_id:'plan'}),{generated:0,invoices:[],skipped:[]});
});
