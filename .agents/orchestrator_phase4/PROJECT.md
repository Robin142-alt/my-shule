# Project: MyShule Event Consumers Remediation (Phase 4)

## Architecture
- Framework: NestJS (TypeScript)
- Event Bus / Outbox: Events are dispatched and consumed asynchronously by event consumers.
- Database ORM: Prisma
- Multi-tenancy Isolation:
  - All database writes/queries in consumers must be scoped to the `schoolId` (or `tenant_id` if using Custom SQL) provided in the event payload.
  - No database writes should be done without `schoolId`.
- Logging: Use `StructuredLoggerService` for logging.

## Code Layout
- Event Consumers: `apps/api/src/modules/<module>/consumers/*.consumer.ts`
- Events System: `apps/api/src/modules/events/`
- Prisma Schema: `prisma/schema.prisma`

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Audit & Prioritize | Scan codebase for `.consumer.ts` files, list stubs, categorize critical vs non-critical. | None | IN_PROGRESS |
| 2 | Critical Admissions Consumers | Implement real Prisma-backed database logic for all Admissions consumers. | M1 | PLANNED |
| 3 | Critical Finance Consumers | Implement real Prisma-backed database logic for all Finance/Billing/Payments consumers. | M1 | PLANNED |
| 4 | Critical Discipline & Exams Consumers | Implement real Prisma-backed database logic for Discipline and Exams consumers. | M1 | PLANNED |
| 5 | Non-Critical Consumers Logging | Update all remaining non-critical event consumers to log using StructuredLoggerService instead of empty stubs. | M1 | PLANNED |
| 6 | Verification & Build | Ensure `npm run build` succeeds in `apps/api` and run audit/test checks. | M2, M3, M4, M5 | PLANNED |

## Interface Contracts
- Consumers must implement `EventConsumerDescriptor`:
```typescript
export interface EventConsumerDescriptor<
  TName extends SupportedDomainEventName = SupportedDomainEventName,
> {
  readonly name: string;
  readonly event_name: TName;
  handle(event: DomainEvent<TName>): Promise<void>;
}
```
- Injected Prisma service: `PrismaService`
- Injected StructuredLoggerService: `StructuredLoggerService`
