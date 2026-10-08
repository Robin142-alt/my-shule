import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { AuthInvitationService } from './auth-invitation.service';
import { AuthRecoveryService } from './auth-recovery.service';
import { evaluatePassword, getPasswordError } from './password-policy';
import { validateSync } from 'class-validator';
import { ResetPasswordDto } from './dto/password-recovery.dto';
import { AcceptInvitationDto } from './dto/invitation.dto';
import { VerifyParentOtpDto } from '../modules/integrations/dto/integrations.dto';

test('password requirements preserve supported characters and match DTO length boundaries', () => {
  for (const password of ['Abcdefghi1', '  Abcde1  ', 'Nairobi7!@#$%^&*()_+-=[]{};:\'",.<>/?\\|`~', 'Abcdefg1😀😀', 'Aa1' + '😀'.repeat(125)]) {
    assert.equal(evaluatePassword(password).valid, true);
    assert.equal(getPasswordError(password), undefined);
    for (const dto of [
      Object.assign(new ResetPasswordDto(), { token: 'a'.repeat(40), password }),
      Object.assign(new AcceptInvitationDto(), { token: 'a'.repeat(40), password }),
      Object.assign(new VerifyParentOtpDto(), { challenge_id: 'a'.repeat(20), otp_code: '123456', new_password: password }),
    ]) assert.deepEqual(validateSync(dto), []);
  }
  assert.equal(evaluatePassword('Aa1' + '😀'.repeat(126)).valid, false);
  assert.equal(evaluatePassword('Abcdefg1😀').valid, false);
  assert.match(getPasswordError('short')!, /Add at least 5 more characters/);
  assert.match(getPasswordError('short')!, /uppercase letter/);
  assert.match(getPasswordError('short')!, /number/);
});

test('reset and invitation reject passwords outside the displayed policy before hashing or persistence', async () => {
  let touched = false;
  const database = { query: async () => { touched = true; return { rows: [] }; } } as never;
  const passwords = { hash: async () => { touched = true; return 'hash'; } } as never;
  const invitation = new AuthInvitationService(database, passwords);
  const recovery = new AuthRecoveryService({} as never, database, passwords, {} as never, {} as never);
  for (const password of ['', 'Short1', 'lowercase123', 'UPPERCASE123', 'MissingNumbers', 'Aa1' + 'x'.repeat(126)]) {
    for (const submit of [
      () => invitation.acceptInvitation({ token: 'a'.repeat(40), password }),
      () => recovery.resetPassword({ token: 'a'.repeat(40), password }),
    ]) {
      await assert.rejects(submit, BadRequestException);
      assert.equal(touched, false, 'Invalid passwords must not reach hashing or token consumption');
    }
  }
});
