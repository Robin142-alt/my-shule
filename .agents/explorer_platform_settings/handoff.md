# Handoff Report: Platform Settings & Maintenance Mode Investigation

## 1. Observation

### 1.1 Database Structure and Prisma Schema
In `prisma/schema.prisma` (lines 6961-6968), the `PlatformSettings` model is defined as follows:
```prisma
model PlatformSettings {
  id              String   @id @default(uuid())
  maintenanceMode Boolean  @map("maintenance_mode")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@map("platform_settings")
}
```
No other platform settings fields are declared in the schema.

### 1.2 Backend Service & Controller
In `apps/api/src/modules/platform/platform-onboarding.controller.ts` (lines 135-138 and lines 175-178):
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

In `apps/api/src/modules/platform/platform-onboarding.service.ts` (lines 2355-2392):
```typescript
  async getSettings() {
    const result = await this.executeSql('SELECT * FROM platform_settings ORDER BY created_at DESC LIMIT 1');
    let settingsRow = result.rows[0];
    if (!settingsRow) {
      const insertResult = await this.executeSql(
        'INSERT INTO platform_settings (id, maintenance_mode, created_at, updated_at) VALUES (gen_random_uuid(), false, NOW(), NOW()) RETURNING *'
      );
      settingsRow = insertResult.rows[0];
    }
    return {
      id: settingsRow.id,
      maintenanceMode: settingsRow.maintenance_mode,
      createdAt: settingsRow.created_at,
      updatedAt: settingsRow.updated_at,
    };
  }

  async updateSettings(body: any) {
    const maintenanceMode = !!body.maintenanceMode;
    const result = await this.executeSql('SELECT id FROM platform_settings ORDER BY created_at DESC LIMIT 1');
    let id = result.rows[0]?.id;
    if (!id) {
      const insertResult = await this.executeSql(
        'INSERT INTO platform_settings (id, maintenance_mode, created_at, updated_at) VALUES (gen_random_uuid(), $1, NOW(), NOW()) RETURNING id',
        [maintenanceMode]
      );
      id = insertResult.rows[0].id;
    } else {
      await this.executeSql(
        'UPDATE platform_settings SET maintenance_mode = $1, updated_at = NOW() WHERE id = $2',
        [maintenanceMode, id]
      );
    }
    return {
      success: true,
      maintenanceMode,
    };
  }
```

### 1.3 Auth Guards and Middleware Chain
In `apps/api/src/app.module.ts` (lines 138-175):
Middlewares are applied in the following order:
```typescript
      .apply(
        CompressionMiddleware,
        RequestContextMiddleware,
        TenantMiddleware,
        AuthContextMiddleware,
        RequestLoggingMiddleware,
        RateLimitMiddleware,
        BillingFeatureMiddleware,
      )
```
Guards are registered globally in the following order:
```typescript
  providers: [
    {
      provide: APP_GUARD,
      useClass: RequestIdInterceptor, // wait, interceptor is APP_INTERCEPTOR
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RbacGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AbacGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ModuleAccessGuard,
    },
  ]
```

In `apps/api/src/auth/auth.constants.ts` (line 43):
```typescript
export const SUPERADMIN_ROLE_OWNER = 'platform_owner';
```

### 1.4 Web Settings Workspace State
In `apps/web/src/components/platform/workspaces/SettingsWorkspace.tsx` (lines 105-146):
```typescript
const defaultSettings = {
  /* Platform Identity */
  platformName: "MyShule",
  platformTagline: "School management made simple",
  platformLogoUrl: "",
  supportEmail: "support@myshule.com",
  supportPhone: "",

  /* Default School Settings */
  defaultAcademicYear: new Date().getFullYear().toString(),
  defaultCountry: "Kenya",
  defaultTimezone: "Africa/Nairobi",
  defaultGradingSystem: "percentage",
  defaultTermStructure: "3-term",

  /* Registration & Onboarding */
  allowSelfRegistration: false,
  requireEmailVerification: true,
  autoAssignCoreModules: true,
  defaultTrialDays: 30,

  /* Session & Security */
  sessionTimeoutMinutes: 60,
  maxLoginAttempts: 5,
  enforce2fa: false,
  passwordMinLength: 8,
  passwordRequireSpecialChar: true,

  /* Email & Notifications */
  emailSenderName: "MyShule",
  emailSenderAddress: "noreply@myshule.com",
  emailProvider: "resend",

  /* Platform Limits */
  maxSchools: 0,
  maxStudentsPerSchool: 0,
  maxStorageMbPerSchool: 0,

  /* Maintenance */
  maintenanceMode: false,
  maintenanceMessage: "MyShule is undergoing scheduled maintenance. We'll be back shortly.",
};
```
The workspace allows the user to change all these settings and sends them via `updatePlatformSettings(s)` (which makes a PUT to `/api/platform/settings`), but the backend only processes and persists `maintenanceMode`.

### 1.5 Package Scripts
In root `package.json` (lines 13-24 & line 60):
- Build command: `npm run build` (calls `npm run prisma:generate && tsc -p tsconfig.json`)
- Onboarding Service Unit test command: `node --test dist/apps/api/src/modules/platform/platform-onboarding.service.test.js`

---

## 2. Logic Chain

1. **Schema Deficiencies**: The `PlatformSettings` model in the Prisma schema only contains `id`, `maintenanceMode`, `createdAt`, and `updatedAt`.
2. **Backend Query/Mutation limitations**: In `platform-onboarding.service.ts`, `getSettings` and `updateSettings` only query and update the `maintenance_mode` field using raw SQL queries via `executeSql`. Any other settings payload keys passed by the frontend in `updateSettings(body)` are ignored.
3. **Frontend Mismatch**: The React workspace `SettingsWorkspace.tsx` manages a rich schema containing 27 setting fields (under identity, limits, security, and defaults). When fetching settings, it merges whatever the API returns with its local hardcoded defaults (`{ ...defaultSettings, ...data }`). On save, it posts the entire object, but because of the backend behavior, all modifications to fields other than `maintenanceMode` are lost upon reload.
4. **Maintenance Mode Integration Hook**:
   - NestJS Middlewares run before Guards.
   - `TenantMiddleware` runs before `AuthContextMiddleware`. This means during `TenantMiddleware`, the request's token has not yet been decoded, and the authenticated user's role is not available in the request context.
   - Placing a maintenance mode check inside a Middleware after `AuthContextMiddleware` or within a global NestJS Guard is optimal.
   - Since we must allow Super Admins (`platform_owner`) to access the platform during maintenance (e.g. to turn maintenance mode off), and we must bypass the check for platform settings endpoints (`/platform/settings`), health endpoints (`/health`), and any public authentication/login endpoints, a global NestJS Guard registered after `JwtAuthGuard` is the most robust integration point. It will have access to the Reflector (to check for `@Public()` or bypass decorators) and to the fully populated request context containing the user's role.

---

## 3. Caveats
- We did not investigate whether other backend controllers have their own localized configurations or if there is a centralized place where database-backed settings should reside.
- The `PlatformSecurityPolicies` table currently exists and is queried/updated independently via separate controller methods. The settings workspace frontend contains security settings (`passwordMinLength`, `passwordRequireSpecialChar`), but they are not wired to `PlatformSecurityPolicies` endpoints; they are treated as part of the monolithic global settings page. This needs to be resolved (either by merging the models or wiring them to the correct endpoints).

---

## 4. Conclusion
1. **Schema Action**: The `PlatformSettings` database model must be updated in `prisma/schema.prisma` to include the remaining 26 fields shown in `SettingsWorkspace.tsx`.
2. **Service Action**: `getSettings` and `updateSettings` in `platform-onboarding.service.ts` must be rewritten (ideally using Prisma or updated SQL statements) to serialize/deserialize the full list of fields.
3. **Global Maintenance Mode Guard**: A new global `MaintenanceModeGuard` should be introduced. It should:
   - Check if global maintenance mode is enabled in `PlatformSettings`.
   - If enabled, block requests (return 503 Service Unavailable with the stored maintenance message) for any non-Super-Admin users on tenant-scoped paths, while allowing Super Admins (`platform_owner`), health check endpoints (`/health`), and platform settings endpoints to pass.

---

## 5. Verification Method

To verify:
1. Run the build command to ensure TypeScript compiles:
   ```bash
   npm run build
   ```
2. Run the onboarding unit tests to ensure no regressions:
   ```bash
   node --test dist/apps/api/src/modules/platform/platform-onboarding.service.test.js
   ```
