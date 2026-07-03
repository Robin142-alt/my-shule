import assert from 'node:assert/strict';
import test from 'node:test';

import { SchoolSettingsService } from './school-settings.service';

test('SchoolSettingsService updates only the current tenant school profile', async () => {
  let updateInput: unknown;
  const service = new SchoolSettingsService(
    {
      school: {
        update: async (input: unknown) => {
          updateInput = input;
          return {
            id: 'school-a',
            address: 'Nairobi',
            phone: '0700000000',
            email: 'office@school.test',
            motto: 'Learn',
          };
        },
      },
    } as never,
    {
      getStore: () => ({ tenant_id: 'school-a' }),
    } as never,
  );

  const result = await service.updateProfile({
    address: '  Nairobi  ',
    phone: ' 0700000000 ',
    email: ' office@school.test ',
    motto: ' Learn ',
  });

  assert.equal(result.id, 'school-a');
  assert.deepEqual(updateInput, {
    where: { id: 'school-a' },
    data: {
      address: 'Nairobi',
      phone: '0700000000',
      email: 'office@school.test',
      motto: 'Learn',
    },
    select: {
      id: true,
      name: true,
      registrationNumber: true,
      address: true,
      phone: true,
      email: true,
      motto: true,
      updatedAt: true,
    },
  });
});

test('SchoolSettingsService rejects empty school profile updates', async () => {
  const service = new SchoolSettingsService(
    {
      school: {
        update: async () => {
          throw new Error('update should not be called');
        },
      },
    } as never,
    {
      getStore: () => ({ tenant_id: 'school-a' }),
    } as never,
  );

  await assert.rejects(() => service.updateProfile({}), /At least one school profile field is required/);
});
