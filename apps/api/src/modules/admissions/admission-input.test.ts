import assert from 'node:assert/strict';
import test from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateManualAdmissionDto } from './dto/create-manual-admission.dto';

import {
  normalizeAdmissionNumber,
  normalizeKenyanPhone,
  normalizePersonName,
  parseAdmissionDate,
  parseOptionalAdmissionDate,
} from './admission-input';

test('ordinary admission normalizes school admission numbers consistently', () => {
  assert.equal(normalizeAdmissionNumber(' adm / 2026 / 0042 '), 'ADM/2026/0042');
  assert.equal(normalizeAdmissionNumber('student- 17'), 'STUDENT-17');
  assert.throws(() => normalizeAdmissionNumber('***'), /Admission number/);
});

test('ordinary admission parses supported direct date formats without ambiguity', () => {
  assert.equal(parseAdmissionDate('03/02/2015', 'Date of birth'), '2015-02-03');
  assert.equal(parseAdmissionDate('03-02-2015', 'Date of birth'), '2015-02-03');
  assert.equal(parseAdmissionDate('2015-02-03', 'Date of birth'), '2015-02-03');
  assert.throws(() => parseAdmissionDate('31/02/2015', 'Date of birth'), /valid calendar date/);
  assert.throws(() => parseAdmissionDate('02/03/15', 'Date of birth'), /DD\/MM\/YYYY/);
});

test('ordinary admission permits an omitted birth date but validates a supplied value', () => {
  assert.equal(parseOptionalAdmissionDate(undefined, 'Date of birth'), null);
  assert.equal(parseOptionalAdmissionDate('   ', 'Date of birth'), null);
  assert.equal(parseOptionalAdmissionDate('03/02/2015', 'Date of birth'), '2015-02-03');
  assert.throws(
    () => parseOptionalAdmissionDate('31/02/2015', 'Date of birth'),
    /valid calendar date/,
  );
});

test('ordinary admission normalizes supported Kenyan guardian phone formats', () => {
  assert.equal(normalizeKenyanPhone('0712 345 678'), '+254712345678');
  assert.equal(normalizeKenyanPhone('254712345678'), '+254712345678');
  assert.equal(normalizeKenyanPhone('+254 712 345 678'), '+254712345678');
  assert.equal(normalizeKenyanPhone('0112-345-678'), '+254112345678');
  assert.throws(() => normalizeKenyanPhone('0201234567'), /Kenyan mobile number/);
});

test('ordinary admission trims and validates required person names', () => {
  assert.equal(normalizePersonName('  Akinyi   Wanjiku ', 'Guardian name'), 'Akinyi Wanjiku');
  assert.throws(() => normalizePersonName(' ', 'Guardian name'), /required/);
});

test('manual and bulk admission accept omitted or blank guardian details but validate supplied values', async () => {
  const valid = { admission_number: 'ADM-001', first_name: 'Amina', last_name: 'Otieno', gender: 'female',
    admission_date: '2026-10-04', class_section_id: 'class-1' };
  for (const contact of [{}, { guardian_name: '', guardian_relationship: '  ' }, { guardian_name: null, guardian_relationship: null },
    { guardian_name: 'A Guardian' }, { guardian_relationship: 'Mother' }]) {
    assert.equal((await validate(plainToInstance(CreateManualAdmissionDto, { ...valid, ...contact }))).length, 0);
  }
  assert.ok((await validate(plainToInstance(CreateManualAdmissionDto, { ...valid, guardian_name: 123 }))).length);
  assert.ok((await validate(plainToInstance(CreateManualAdmissionDto, { ...valid, guardian_relationship: ['Mother'] }))).length);
});
