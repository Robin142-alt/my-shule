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
    {} as never,
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
    {} as never,
  );

  await assert.rejects(() => service.updateProfile({}), /At least one school profile field is required/);
});

test('SchoolSettingsService exposes tenant branding and serves its stored logo', async () => {
  let logoRead: Record<string, unknown> | undefined;
  const service = new SchoolSettingsService(
    {
      $queryRawUnsafe: async () => [{
        name: 'Kibabi High',
        subdomain: 'kibabi-high',
        settings: {
          logo_url: '/legacy/logo.png',
          logo_storage_path: 'tenant/kibabi-high/school_logo/logo.png',
        },
      }],
    } as never,
    {
      getStore: () => ({ tenant_id: 'kibabi-high' }),
    } as never,
    {
      readForTenant: async (input: Record<string, unknown>) => {
        logoRead = input;
        return {
          content: Buffer.from('logo'),
          mime_type: 'image/png',
          original_file_name: 'logo.png',
          size_bytes: 4,
        };
      },
    } as never,
  );

  assert.deepEqual(await service.getIdentity(), {
    tenantId: 'kibabi-high',
    subdomain: 'kibabi-high',
    schoolName: 'Kibabi High',
    logoUrl: '/api/school/identity/logo',
  });
  assert.equal((await service.getIdentityLogo()).mime_type, 'image/png');
  assert.deepEqual(logoRead, {
    tenantId: 'kibabi-high',
    storagePath: 'tenant/kibabi-high/school_logo/logo.png',
  });
});
