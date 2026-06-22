# R2 Backend Tenant Isolation Gaps Report - Secretary Queue Ticket Manipulation

## 1. Observation

In `apps/api/src/modules/secretary/secretary.controller.ts`, the `handleInquiries` method (lines 221-337) processes different actions on `WorkflowTask` entities: `mark_served`, `send_sms`, and `escalate`.

For all three actions, the database retrieval pattern is identical:
* **`mark_served` (Lines 246-250):**
  ```typescript
  const task = await tx.workflowTask.findUnique({ where: { id } });
  if (task) {
    if (task.schoolId !== tenantId) {
      throw new BadRequestException('Task does not belong to the caller\'s school context');
    }
  ```
* **`send_sms` (Lines 275-279):**
  ```typescript
  const task = await tx.workflowTask.findUnique({ where: { id } });
  if (task) {
    if (task.schoolId !== tenantId) {
      throw new BadRequestException('Task does not belong to the caller\'s school context');
    }
  ```
* **`escalate` (Lines 303-307):**
  ```typescript
  const task = await tx.workflowTask.findUnique({ where: { id } });
  if (task) {
    if (task.schoolId !== tenantId) {
      throw new BadRequestException('Task does not belong to the caller\'s school context');
    }
  ```

Additionally, in `handleVisitors` (lines 109-181), similar post-query validation issues occur for `visitorLog` in actions `print_slip` and `check_out`:
* **`print_slip` (Lines 153-156):**
  ```typescript
  const log = await tx.visitorLog.findUnique({ where: { id } });
  if (log && log.schoolId !== tenantId) {
    throw new BadRequestException('Visitor log does not belong to the caller\'s school context');
  }
  ```
* **`check_out` (Lines 164-167):**
  ```typescript
  const log = await tx.visitorLog.findUnique({ where: { id } });
  if (log && log.schoolId !== tenantId) {
    throw new BadRequestException('Visitor log does not belong to the caller\'s school context');
  }
  ```

---

## 2. Logic Chain

1. **Post-Query Tenant Check vs. Query-Level Isolation:**
   * Direct database queries using `findUnique({ where: { id } })` query the global table space without restricting the search space to the current tenant. 
   * This is a tenant isolation leak/gap because the database process reads and loads the document representation of a record from another tenant into the application's RAM before performing the permission/isolation check.
   * If a malicious user supplies an ID from another tenant, it results in the record being loaded, which is vulnerable to side-channel timing attacks or data leakage if subsequent error handlers inadvertently log the loaded entity.

2. **Silent Success on Missing Records:**
   * If `task` is `null`/`undefined` (meaning the record does not exist in the database or belongs to another tenant and was not found), the condition `if (task)` is bypassed entirely.
   * The controller proceeds to return `{ success: true }` without executing any of the required state updates or informing the user of the invalid ID.
   * This silent failure bypasses standard error response contracts and can lead to inconsistent state representations on the frontend.

3. **Inconsistent Visitor Log Handling:**
   * In `print_slip` and `check_out`, if `log` is null, the post-query verification is bypassed. However, the subsequent database update statement is still called:
     ```typescript
     await tx.visitorLog.update({
       where: { id },
       data: { ... }
     });
     ```
     This results in Prisma throwing an unhandled database error because it attempts to update a non-existent record.

---

## 3. Caveats

* **Database Constraints:** Since `WorkflowTask` does not have a compound unique constraint on `[id, schoolId]`, Prisma's `findUnique` cannot query both fields simultaneously. We must use `findFirst` to enforce query-level scope filters.
* **Offline Client Generation:** We assume the frontend generates unique UUIDs for new inquiries, allowing `add_inquiry` to pass `inquiry.id || undefined`. If client-side ID generation is not required, we should let the database generate UUIDs.

---

## 4. Conclusion

We recommend refactoring `apps/api/src/modules/secretary/secretary.controller.ts` to replace all global `findUnique` calls with query-level scoped `findFirst` checks that enforce `schoolId: tenantId` inside the query parameters. Additionally, proper exception handling should be implemented to throw a `BadRequestException` when records are not found.

### Precise Code-Level Fixes (Proposed)

#### Fix 1: Refactor `mark_served`, `send_sms`, and `escalate` in `handleInquiries`

```typescript
<<<<
        } else if (action === 'mark_served') {
          const task = await tx.workflowTask.findUnique({ where: { id } });
          if (task) {
            if (task.schoolId !== tenantId) {
              throw new BadRequestException('Task does not belong to the caller\'s school context');
            }
            let record: any = {};
            try {
              record = JSON.parse(task.description);
            } catch (e) {
              record = {
                parent: task.title.replace('Inquiry:', '').trim(),
                student: '',
                className: '',
                phone: '',
                issue: task.description,
                department: 'Finance',
                smsSent: false
              };
            }
            record.status = 'Resolved';
            await tx.workflowTask.update({
              where: { id },
              data: {
                status: 'DONE',
                description: JSON.stringify(record)
              }
            });
          }
        } else if (action === 'send_sms') {
          const task = await tx.workflowTask.findUnique({ where: { id } });
          if (task) {
            if (task.schoolId !== tenantId) {
              throw new BadRequestException('Task does not belong to the caller\'s school context');
            }
            let record: any = {};
            try {
              record = JSON.parse(task.description);
            } catch (e) {
              record = {
                parent: task.title.replace('Inquiry:', '').trim(),
                student: '',
                className: '',
                phone: '',
                issue: task.description,
                department: 'Finance',
                status: 'Waiting'
              };
            }
            record.smsSent = true;
            await tx.workflowTask.update({
              where: { id },
              data: {
                description: JSON.stringify(record)
              }
            });
          }
        } else if (action === 'escalate') {
          const task = await tx.workflowTask.findUnique({ where: { id } });
          if (task) {
            if (task.schoolId !== tenantId) {
              throw new BadRequestException('Task does not belong to the caller\'s school context');
            }
            let record: any = {};
            try {
              record = JSON.parse(task.description);
            } catch (e) {
              record = {
                parent: task.title.replace('Inquiry:', '').trim(),
                student: '',
                className: '',
                phone: '',
                issue: task.description,
                department: 'Finance',
                smsSent: false
              };
            }
            record.status = 'Escalated';
            await tx.workflowTask.update({
              where: { id },
              data: {
                priority: 'HIGH',
                description: JSON.stringify(record)
              }
            });
          }
        }
====
        } else if (action === 'mark_served') {
          const task = await tx.workflowTask.findFirst({
            where: {
              id,
              schoolId: tenantId,
            },
          });
          if (!task) {
            throw new BadRequestException('Task not found');
          }
          let record: any = {};
          try {
            record = JSON.parse(task.description);
          } catch (e) {
            record = {
              parent: task.title.replace('Inquiry:', '').trim(),
              student: '',
              className: '',
              phone: '',
              issue: task.description,
              department: 'Finance',
              smsSent: false
            };
          }
          record.status = 'Resolved';
          await tx.workflowTask.update({
            where: { id },
            data: {
              status: 'DONE',
              description: JSON.stringify(record)
            }
          });
        } else if (action === 'send_sms') {
          const task = await tx.workflowTask.findFirst({
            where: {
              id,
              schoolId: tenantId,
            },
          });
          if (!task) {
            throw new BadRequestException('Task not found');
          }
          let record: any = {};
          try {
            record = JSON.parse(task.description);
          } catch (e) {
            record = {
              parent: task.title.replace('Inquiry:', '').trim(),
              student: '',
              className: '',
              phone: '',
              issue: task.description,
              department: 'Finance',
              status: 'Waiting'
            };
          }
          record.smsSent = true;
          await tx.workflowTask.update({
            where: { id },
            data: {
              description: JSON.stringify(record)
            }
          });
        } else if (action === 'escalate') {
          const task = await tx.workflowTask.findFirst({
            where: {
              id,
              schoolId: tenantId,
            },
          });
          if (!task) {
            throw new BadRequestException('Task not found');
          }
          let record: any = {};
          try {
            record = JSON.parse(task.description);
          } catch (e) {
            record = {
              parent: task.title.replace('Inquiry:', '').trim(),
              student: '',
              className: '',
              phone: '',
              issue: task.description,
              department: 'Finance',
              smsSent: false
            };
          }
          record.status = 'Escalated';
          await tx.workflowTask.update({
            where: { id },
            data: {
              priority: 'HIGH',
              description: JSON.stringify(record)
            }
          });
        }
>>>>
```

#### Fix 2: Refactor `print_slip` and `check_out` in `handleVisitors`

```typescript
<<<<
        } else if (action === 'print_slip') {
          const log = await tx.visitorLog.findUnique({ where: { id } });
          if (log && log.schoolId !== tenantId) {
            throw new BadRequestException('Visitor log does not belong to the caller\'s school context');
          }
          await tx.visitorLog.update({
            where: { id },
            data: {
              updatedAt: new Date()
            }
          });
        } else if (action === 'check_out') {
          const log = await tx.visitorLog.findUnique({ where: { id } });
          if (log && log.schoolId !== tenantId) {
            throw new BadRequestException('Visitor log does not belong to the caller\'s school context');
          }
          await tx.visitorLog.update({
            where: { id },
            data: {
              timeOut: new Date(),
              status: 'CHECKED_OUT'
            }
          });
        }
====
        } else if (action === 'print_slip') {
          const log = await tx.visitorLog.findFirst({
            where: {
              id,
              schoolId: tenantId,
            },
          });
          if (!log) {
            throw new BadRequestException('Visitor log not found');
          }
          await tx.visitorLog.update({
            where: { id },
            data: {
              updatedAt: new Date()
            }
          });
        } else if (action === 'check_out') {
          const log = await tx.visitorLog.findFirst({
            where: {
              id,
              schoolId: tenantId,
            },
          });
          if (!log) {
            throw new BadRequestException('Visitor log not found');
          }
          await tx.visitorLog.update({
            where: { id },
            data: {
              timeOut: new Date(),
              status: 'CHECKED_OUT'
            }
          });
        }
>>>>
```

---

## 5. Verification Method

To verify these changes:

1. **Compilation Check:**
   Run the project's type checker to ensure there are no compilation errors:
   ```bash
   npm run typecheck
   ```
2. **Execute Tests:**
   Run the multi-tenant isolation integration test suite to verify that tenant boundaries are intact:
   ```bash
   npm run test:tenant-isolation
   ```
3. **Integration Test Verification:**
   To verify this specific endpoint, we can add a test case to `apps/api/test/tenant-isolation.integration-spec.ts`.
   
   Here is a draft implementation for the integration test case:
   ```typescript
   test('tenant A cannot manipulate tenant B workflow task in secretary module', async () => {
     // 1. Create a task belonging to Tenant B
     const task = await prisma.workflowTask.create({
       data: {
         schoolId: tenantB.tenant_id,
         title: 'Inquiry: Tenant B Parent',
         description: JSON.stringify({ parent: 'Tenant B Parent', status: 'Waiting' }),
         assignedToUserId: 'system',
         createdByUserId: 'system',
         priority: 'NORMAL',
         status: 'TODO',
       }
     });

     // 2. Try to mark it as served using Tenant A's context
     const response = await request(app.getHttpServer())
       .post('/api/secretary/inquiries')
       .set('host', tenantA.host)
       .set('authorization', `Bearer ${tenantA.access_token}`)
       .send({
         action: 'mark_served',
         id: task.id
       })
       .expect(400);

     expect(response.body.message).toContain('Task not found');
   });
   ```
