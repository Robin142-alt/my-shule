import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPairSync, sign } from 'node:crypto';
import { KcbBuniAdapter } from './kcb-buni.adapter';
import type { BankConnection } from './bank-provider';

const keys=generateKeyPairSync('rsa',{modulusLength:2048});
const connection:BankConnection={school_id:'school-a',revision_id:'revision-a',environment:'sandbox',account_number:'1234567890',
  credentials:{bank_public_key:keys.publicKey.export({type:'spki',format:'pem'}).toString()}};
const body={transactionReference:'FT000262556',requestId:'request-123',channelCode:'202',timestamp:'202610011305',
  transactionAmount:'123.45',currency:'KES',customerReference:'ADM-001',customerName:'Test payer',customerMobileNumber:'254700000000',
  balance:'',narration:'School fees',creditAccountIdentifier:'1234567890',organizationShortCode:'202',tillNumber:'202'};
const adapter=new KcbBuniAdapter();
function signed(value:unknown=body){const raw=Buffer.from(JSON.stringify(value));return {raw,headers:{signature:sign('RSA-SHA256',raw,keys.privateKey).toString('base64')}};}

test('KCB authenticates the original bytes with the bank RSA key and normalizes credited account notifications',()=>{
  const {raw,headers}=signed();adapter.notifications.authenticate(connection,raw,headers);
  const [entry]=adapter.notifications.parse(connection,JSON.parse(raw.toString()));
  assert.equal(entry.payment.destination_account,connection.account_number);
  assert.equal(entry.payment.amount_minor,'12345');assert.equal(entry.payment.provider_transaction_id,'FT000262556');
  assert.equal(entry.payment.account_reference,'ADM-001');assert.equal(entry.payment.occurred_at,'2026-10-01T10:05:00.000Z');
  assert.equal(entry.direction,'credit');assert.equal(entry.evidence.method,'kcb_rsa_account_credit');
  assert.deepEqual(adapter.notifications.acknowledge(body),{transactionID:'request-123',statusCode:'0',statusMessage:'Notification received'});
});
test('KCB rejects forged signatures, changed raw bytes, duplicate signature headers and invalid verification keys',()=>{
  const {raw,headers}=signed();
  for(const [bytes,values] of [[Buffer.from(raw.toString()+' '),headers],[raw,{}],[raw,{signature:headers.signature+', '+headers.signature}]] as const)
    assert.throws(()=>adapter.notifications.authenticate(connection,bytes,values),/signature/i);
  const other=generateKeyPairSync('rsa',{modulusLength:2048});
  assert.throws(()=>adapter.notifications.authenticate({...connection,credentials:{bank_public_key:other.publicKey.export({type:'spki',format:'pem'}).toString()}},raw,headers),/signature/i);
  assert.throws(()=>adapter.notifications.authenticate({...connection,credentials:{bank_public_key:'invalid'}},raw,headers),/key/i);
});
test('KCB never identifies a school from the student reference and rejects ambiguous or non-credit evidence',()=>{
  for(const changes of [{creditAccountIdentifier:'OTHER'},{currency:'USD'},{transactionAmount:'-1'},
    {transactionAmount:'0'},{transactionAmount:'0.001'},{transactionAmount:123.45},{timestamp:'2021111103005'},
    {timestamp:'202602301200'},{transactionReference:''},{customerReference:'x'.repeat(121)}])
    assert.throws(()=>adapter.notifications.parse(connection,{...body,...changes}));
  assert.throws(()=>adapter.notifications.parse(connection,{requestPayload:{additionalData:{notificationData:body}}}),/account/i);
});
test('saving a KCB public key is not an authenticated bank connection check',async()=>{
  await assert.rejects(()=>adapter.checkConnection(connection),/signed.*notification/i);
});
