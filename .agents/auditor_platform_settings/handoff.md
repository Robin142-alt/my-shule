# Forensic Audit Report

**Work Product**: Platform Settings and Maintenance Mode Implementation
**Profile**: General Project
**Verdict**: CLEAN

---

## 1. Observation

### Observation 1: Database Schema (`prisma/schema.prisma`)
The `PlatformSettings` model is declared in `prisma/schema.prisma` at lines 6961-6994 as follows:
```prisma
model PlatformSettings {
  id                         String   @id @default(uuid())
  maintenanceMode            Boolean  @map("maintenance_mode")
  maintenanceMessage         String?  @map("maintenance_message")
  platformName               String?  @map("platform_name")
  platformTagline            String?  @map("platform_tagline")
  platformLogoUrl            String?  @map("platform_logo_url")
  supportEmail               String?  @map("support_email")
  supportPhone               String?  @map("support_phone")
  defaultAcademicYear        String?  @map("default_academic_year")
  defaultCountry             String?  @map("default_country")
  defaultTimezone            String?  @map("default_timezone")
  defaultGradingSystem       String?  @map("default_grading_system")
  defaultTermStructure       String?  @map("default_term_structure")
  allowSelfRegistration      Boolean? @map("allow_self_registration")
  requireEmailVerification   Boolean? @map("require_email_verification")
  autoAssignCoreModules      Boolean? @map("auto_assign_core_modules")
  defaultTrialDays           Int?     @map("default_trial_days")
  sessionTimeoutMinutes      Int?     @map("session_timeout_minutes")
  maxLoginAttempts           Int?     @map("max_login_attempts")
  enforce2fa                 Boolean? @map("enforce_2fa")
  passwordMinLength          Int?     @map("password_min_length")
  passwordRequireSpecialChar Boolean? @map("password_require_special_char")
  emailSenderName            String?  @map("email_sender_name")
  emailSenderAddress         String?  @map("email_sender_address")
  emailProvider              String?  @map("email_provider")
  maxSchools                 Int?     @map("max_schools")
  maxStudentsPerSchool       Int?     @map("max_students_per_school")
  maxStorageMbPerSchool      Int?     @map("max_storage_mb_per_school")
  createdAt                  DateTime @default(now()) @map("created_at")
  updatedAt                  DateTime @updatedAt @map("updated_at")

  @@map("platform_settings")
}
```

### Observation 2: Backend Settings Operations (`platform-onboarding.service.ts` & `platform-onboarding.controller.ts`)
The settings service methods in `apps/api/src/modules/platform/platform-onboarding.service.ts` are database-backed and check all fields:
```typescript
  async getSettings() {
    let settings = await this.prisma.platformSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!settings) {
      settings = await this.prisma.platformSettings.create({
        data: {
          maintenanceMode: false,
        },
      });
    }
    return settings;
  }

  async updateSettings(body: any) {
    const latest = await this.prisma.platformSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    const data: any = {};
    const fields = [
      'maintenanceMode',
      'maintenanceMessage',
      ...
    ];
    ...
    let updated;
    if (latest) {
      updated = await this.prisma.platformSettings.update({
        where: { id: latest.id },
        data,
      });
    } else {
      updated = await this.prisma.platformSettings.create({
        data,
      });
    }

    return {
      success: true,
      ...updated,
    };
  }
```
The controller at `apps/api/src/modules/platform/platform-onboarding.controller.ts` directly forwards commands:
```typescript
  @Get('settings')
  getSettings() {
    return this.onboardingService.getSettings();
  }

  @Put('settings')
  updateSettings(@Body() body: any) {
    return this.onboardingService.updateSettings(body);
  }
```

### Observation 3: Maintenance Guard (`apps/api/src/guards/maintenance-mode.guard.ts`)
`MaintenanceModeGuard` executes actual settings database retrieval using:
```typescript
    const settings = await this.platformOnboardingService.getSettings();
    if (settings?.maintenanceMode) {
      const requestContext = this.requestContext.getStore();
      if (requestContext?.role === SUPERADMIN_ROLE_OWNER) {
        return true;
      }

      const message = settings.maintenanceMessage || 'The system is currently undergoing scheduled maintenance. Please try again later.';
      throw new ServiceUnavailableException(message);
    }
```

### Observation 4: Test Suite Results (`apps/api/src/modules/platform/platform-onboarding.service.test.ts`)
Unit tests successfully mock Prisma responses and test genuine service methods. The following tests executed successfully:
```
# Subtest: PlatformOnboardingService getSettings retrieves or creates settings
ok 17 - PlatformOnboardingService getSettings retrieves or creates settings
# Subtest: PlatformOnboardingService updateSettings updates existing settings
ok 18 - PlatformOnboardingService updateSettings updates existing settings
# Subtest: MaintenanceModeGuard allows platform_owner in maintenance mode
ok 19 - MaintenanceModeGuard allows platform_owner in maintenance mode
# Subtest: MaintenanceModeGuard blocks member role in maintenance mode
ok 20 - MaintenanceModeGuard blocks member role in maintenance mode
# Subtest: MaintenanceModeGuard allows member role when maintenance mode is disabled
ok 21 - MaintenanceModeGuard allows member role when maintenance mode is disabled
```

---

## 2. Logic Chain

1. **Schema Check**: We verified that `PlatformSettings` exists in `prisma/schema.prisma` and maps all fields (including `maintenanceMode`, `maxSchools`, etc.) to the relational database table `platform_settings`.
2. **Controller/Service Analysis**: `getSettings` and `updateSettings` in the backend service query the database via the Prisma client using `findFirst`, `create`, and `update` rather than returning mock/hardcoded JSON objects.
3. **Guard Verification**: `MaintenanceModeGuard` imports `PlatformOnboardingService` and queries `getSettings()` dynamically. It correctly throws a 503 `ServiceUnavailableException` when `maintenanceMode` is true, except for allowed path/role overrides.
4. **Test Integrity**: The test suite covers service settings retrieval, updates, and maintenance guard edge cases. It verifies actual function logic via mocked database drivers instead of self-certifying mocks or skipped assertions.

---

## 3. Caveats

No caveats. All areas outlined in the scope were fully investigated and verified.

---

## 4. Conclusion

The implementation of **Platform Settings and Maintenance Mode** is fully verified and deemed **CLEAN**. There are no integrity violations, facade implementations, hardcoded test routes, or self-certifying mock shortcuts.

---

## 5. Verification Method

To independently verify the test suite:
1. Compile code: `npm run build`
2. Execute tests: `node --test dist/apps/api/src/modules/platform/platform-onboarding.service.test.js`
