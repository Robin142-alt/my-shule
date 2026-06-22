# Handoff Report: R2 Backend Tenant Isolation Gaps Analysis

This report documents the detailed investigation of R2 Backend Tenant Isolation gaps in Shule Hub and proposes precise, production-safe, code-level fixes that assert ownership checks match the request/event context.

---

## 1. Observation

We investigated the following four targets for tenant isolation vulnerabilities:

### Target 1: Student Exit Clearance
- **File**: `apps/api/src/modules/students/student-lifecycle.service.ts`
- **Lines**: ~189-194 (inside `exitStudent` method)
- **Current Code**:
  ```typescript
  if (clearanceId) {
    const clearance = await tx.studentClearance.findUnique({ where: { id: clearanceId } });
    if (!clearance || clearance.schoolId !== schoolId || clearance.status !== 'CLEARED') {
      throw new BadRequestException('Student must be fully cleared before exiting');
    }
  }
  ```

### Target 2: Medicine Dispensing stock updates
- **File**: `apps/api/src/modules/operations/consumers/dispense-medicine.consumer.ts`
- **Lines**: ~27-68 (inside event handler `handle`)
- **Current Code**:
  ```typescript
  await this.prisma.executeWithTenant(tenant_id, data.dispensedByUserId || 'system', async (tx: any) => {
    let medicalVisitId = data.medicalVisitId;
    
    if (!medicalVisitId) {
      const visit = await tx.medicalVisit.create({
        data: {
          schoolId: tenant_id,
          studentId: data.studentId,
          nurseUserId: data.dispensedByUserId || 'system',
          visitTime: new Date(),
          symptoms: data.symptoms,
          severity: data.severity || 'MILD',
          actionTaken: 'MEDICINE_DISPENSED',
          parentNotified: data.parentNotified || false,
          status: 'TREATED'
        }
      });
      medicalVisitId = visit.id;
    }

    await tx.medicineDispensingLog.create({
      data: {
        schoolId: tenant_id,
        medicalVisitId: medicalVisitId,
        medicineInventoryId: data.medicineInventoryId,
        quantityDispensed: data.quantityDispensed,
        dosageNotes: data.dosageNotes || 'Follow prescription',
        dispensedByUserId: data.dispensedByUserId || 'system'
      }
    });

    const inventory = await tx.medicineInventory.findFirst({
      where: { id: data.medicineInventoryId, schoolId: tenant_id }
    });
    if (!inventory) {
      throw new Error('Medicine inventory not found or access denied');
    }
    await tx.medicineInventory.update({
      where: { id: data.medicineInventoryId },
      data: { quantityAvailable: inventory.quantityAvailable - data.quantityDispensed }
    });
  });
  ```

### Target 3: Stock Issuing isolation
- **File**: `apps/api/src/modules/operations/consumers/issue-stock.consumer.ts`
- **Lines**: ~28-50 (inside event handler `handle`)
- **Current Code**:
  ```typescript
  await this.prisma.executeWithTenant(tenant_id, 'system', async (tx: any) => {
    const item = await tx.inventoryItem.findFirst({
      where: { id: data.inventoryItemId, schoolId: tenant_id }
    });
    if (!item) {
      throw new Error('Inventory item not found or access denied');
    }
    await tx.inventoryStockMovement.create({
      data: {
        schoolId: tenant_id,
        inventoryItemId: data.inventoryItemId,
        movementType: 'OUT',
        quantity: data.quantity,
        fromLocation: item.storageLocation,
        toLocation: data.toLocation || 'ISSUED',
        issuedToDepartmentId: data.issuedToDepartmentId || undefined,
      }
    });

    await tx.inventoryItem.update({
      where: { id: data.inventoryItemId },
      data: { quantityAvailable: item.quantityAvailable - data.quantity }
    });
  });
  ```

### Target 4: Payment Posting on foreign invoices
- **File**: `apps/api/src/modules/operations/consumers/record-payment.consumer.ts`
- **Lines**: ~27-65 (inside event handler `handle`)
- **Current Code**:
  ```typescript
  await this.prisma.executeWithTenant(tenant_id, data.receivedByUserId || 'system', async (tx: any) => {
    // Create payment
    await tx.payment.create({
      data: {
        schoolId: tenant_id,
        studentId: data.studentId,
        invoiceId: data.invoiceId || undefined,
        ...
      }
    });

    // Update invoice balance if applicable
    if (data.invoiceId) {
      const invoice = await tx.invoice.findFirst({
        where: { id: data.invoiceId, schoolId: tenant_id }
      });
      if (!invoice) {
        throw new Error('Invoice not found or access denied');
      }
      ...
      await tx.invoice.update({
        where: { id: invoice.id },
        ...
      });
    }
  });
  ```

---

## 2. Logic Chain

The reasoning linking each observed gap to tenant isolation and data integrity risks is as follows:

1. **Student Exit Clearance**:
   - *Observation*: The code retrieves the clearance record by unique ID `clearanceId` and asserts that its `schoolId` matches `schoolId`. It checks that its status is `CLEARED`. However, it does **not** assert that `clearance.studentId === studentId`.
   - *Logic*: An attacker (or a faulty front-end) can pass the ID of a cleared record belonging to *Student B* to the exit workflow of *Student A* within the same school. Since `schoolId` matches, the validation passes, allowing *Student A* to bypass their exit clearance checks.

2. **Medicine Dispensing**:
   - *Observation*: The code consumes a `workflow.action.completed` event, gets `tenant_id` and `data.studentId`, and creates a `medicalVisit` without verifying that the student belongs to the tenant.
   - *Logic*: A cross-tenant data leak or injection is possible if the incoming payload contains a `studentId` from a different tenant. A visit and dispensing log would be successfully recorded under the recipient's `tenant_id` referencing a student ID belonging to a different tenant.
   - *Observation*: If `data.medicalVisitId` is provided, it is linked without verification that the visit exists, belongs to the current tenant, and belongs to the specified student.
   - *Logic*: A malicious user could link a medicine dispensing action to a foreign or invalid `medicalVisitId` inside the system.

3. **Stock Issuing**:
   - *Observation*: The code associates `data.issuedToDepartmentId` directly with the created `InventoryStockMovement` without verifying that the department belongs to the tenant (`tenant_id`).
   - *Logic*: Departments are school-scoped entities. Without verifying that `issuedToDepartmentId` belongs to `tenant_id`, stock items can be logged as issued to a department that belongs to another school, causing a cross-tenant data reference leak.

4. **Payment Posting**:
   - *Observation*: The code logs a payment for `data.studentId` under `tenant_id` and, if an `invoiceId` is provided, updates that invoice. It verifies the invoice belongs to the tenant via `schoolId: tenant_id`, but does **not** verify that the invoice's `studentId` matches the requested `data.studentId` or that `data.studentId` belongs to `tenant_id`.
   - *Logic*: A payment can be misallocated in two ways:
     - Posting a payment for a student ID that belongs to a different tenant.
     - Posting a payment targeting a valid invoice for *Student A* but specifying *Student B*'s ID. This results in inconsistent records (the payment lists *Student B*, but decreases the balance of *Student A*'s invoice).

---

## 3. Caveats

- **Prisma Middlewares/RLS Policies**: We assume that database transactions executed using `this.prisma.executeWithTenant(tenant_id, ...)` invoke row-level security (RLS) or session-based tenant isolation. However, database-level RLS policies on tables with foreign keys might not prevent invalid cross-resource relations (like linking school B's payment to school A's student if the payment table insert uses school B's ID) unless explicitly guarded by application logic.
- **Auditing/Logging**: The proposed fixes focus strictly on raising exceptions when tenant isolation assertions fail. This assumes that standard platform event flows or error logs will capture and report these failures.

---

## 4. Conclusion & Proposed Fixes

To achieve absolute multi-tenant and cross-resource isolation, we must assert that all records, relation IDs, and child resources belong to the active school (`schoolId` or `tenant_id`) and correlate correctly.

### Precise Code-Level Fixes

#### Fix 1: Student Exit Clearance
Update the clearance verification to assert `clearance.studentId === studentId`:
```typescript
// apps/api/src/modules/students/student-lifecycle.service.ts
      if (clearanceId) {
        const clearance = await tx.studentClearance.findUnique({ where: { id: clearanceId } });
        if (!clearance || clearance.schoolId !== schoolId || clearance.studentId !== studentId || clearance.status !== 'CLEARED') {
          throw new BadRequestException('Student must be fully cleared before exiting');
        }
      }
```

#### Fix 2: Medicine Dispensing
Add student validation, check the provided `medicalVisitId`, and assert inventory isolation:
```typescript
// apps/api/src/modules/operations/consumers/dispense-medicine.consumer.ts
      await this.prisma.executeWithTenant(tenant_id, data.dispensedByUserId || 'system', async (tx: any) => {
        // 1. Verify student exists and belongs to the current tenant
        const student = await tx.student.findFirst({
          where: { id: data.studentId, schoolId: tenant_id }
        });
        if (!student) {
          throw new Error('Student not found or access denied');
        }

        let medicalVisitId = data.medicalVisitId;
        
        if (!medicalVisitId) {
          const visit = await tx.medicalVisit.create({
            data: {
              schoolId: tenant_id,
              studentId: data.studentId,
              nurseUserId: data.dispensedByUserId || 'system',
              visitTime: new Date(),
              symptoms: data.symptoms,
              severity: data.severity || 'MILD',
              actionTaken: 'MEDICINE_DISPENSED',
              parentNotified: data.parentNotified || false,
              status: 'TREATED'
            }
          });
          medicalVisitId = visit.id;
        } else {
          // 2. Verify the provided medical visit belongs to the tenant and the student
          const visit = await tx.medicalVisit.findFirst({
            where: { id: medicalVisitId, schoolId: tenant_id, studentId: data.studentId }
          });
          if (!visit) {
            throw new Error('Medical visit not found or access denied');
          }
        }

        // 3. Verify medicine inventory exists and belongs to tenant
        const inventory = await tx.medicineInventory.findFirst({
          where: { id: data.medicineInventoryId, schoolId: tenant_id }
        });
        if (!inventory) {
          throw new Error('Medicine inventory not found or access denied');
        }

        await tx.medicineDispensingLog.create({
          data: {
            schoolId: tenant_id,
            medicalVisitId: medicalVisitId,
            medicineInventoryId: data.medicineInventoryId,
            quantityDispensed: data.quantityDispensed,
            dosageNotes: data.dosageNotes || 'Follow prescription',
            dispensedByUserId: data.dispensedByUserId || 'system'
          }
        });

        await tx.medicineInventory.update({
          where: { id: data.medicineInventoryId },
          data: { quantityAvailable: inventory.quantityAvailable - data.quantityDispensed }
        });
      });
```

#### Fix 3: Stock Issuing isolation
Verify the department belongs to the tenant if provided:
```typescript
// apps/api/src/modules/operations/consumers/issue-stock.consumer.ts
      await this.prisma.executeWithTenant(tenant_id, 'system', async (tx: any) => {
        const item = await tx.inventoryItem.findFirst({
          where: { id: data.inventoryItemId, schoolId: tenant_id }
        });
        if (!item) {
          throw new Error('Inventory item not found or access denied');
        }

        // Verify the department belongs to the current tenant
        if (data.issuedToDepartmentId) {
          const department = await tx.department.findFirst({
            where: { id: data.issuedToDepartmentId, schoolId: tenant_id }
          });
          if (!department) {
            throw new Error('Department not found or access denied');
          }
        }

        await tx.inventoryStockMovement.create({
          data: {
            schoolId: tenant_id,
            inventoryItemId: data.inventoryItemId,
            movementType: 'OUT',
            quantity: data.quantity,
            fromLocation: item.storageLocation,
            toLocation: data.toLocation || 'ISSUED',
            issuedToDepartmentId: data.issuedToDepartmentId || undefined,
          }
        });

        await tx.inventoryItem.update({
          where: { id: data.inventoryItemId },
          data: { quantityAvailable: item.quantityAvailable - data.quantity }
        });
      });
```

#### Fix 4: Payment Posting
Verify that both the student and the invoice belong to the tenant, and assert that the invoice belongs to the specified student:
```typescript
// apps/api/src/modules/operations/consumers/record-payment.consumer.ts
      await this.prisma.executeWithTenant(tenant_id, data.receivedByUserId || 'system', async (tx: any) => {
        // 1. Verify student exists and belongs to tenant
        const student = await tx.student.findFirst({
          where: { id: data.studentId, schoolId: tenant_id }
        });
        if (!student) {
          throw new Error('Student not found or access denied');
        }

        // 2. Verify invoice belongs to tenant AND the specified student if invoiceId is provided
        if (data.invoiceId) {
          const invoice = await tx.invoice.findFirst({
            where: { id: data.invoiceId, schoolId: tenant_id }
          });
          if (!invoice) {
            throw new Error('Invoice not found or access denied');
          }
          if (invoice.studentId !== data.studentId) {
            throw new Error('Invoice does not belong to the specified student');
          }

          const newAmountPaid = invoice.amountPaid + data.amount;
          const newBalance = invoice.amountDue - newAmountPaid;
          const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';

          // Create payment linked to the invoice
          await tx.payment.create({
            data: {
              schoolId: tenant_id,
              studentId: data.studentId,
              invoiceId: data.invoiceId,
              paymentReference: data.paymentReference,
              paymentMethod: data.paymentMethod || 'BANK',
              amount: data.amount,
              paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
              receivedByUserId: data.receivedByUserId || 'system',
              status: 'CONFIRMED',
              remarks: data.remarks || 'Payment received via portal',
            }
          });

          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              amountPaid: newAmountPaid,
              balance: newBalance > 0 ? newBalance : 0,
              status: newStatus
            }
          });
        } else {
          // Create unallocated payment
          await tx.payment.create({
            data: {
              schoolId: tenant_id,
              studentId: data.studentId,
              paymentReference: data.paymentReference,
              paymentMethod: data.paymentMethod || 'BANK',
              amount: data.amount,
              paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
              receivedByUserId: data.receivedByUserId || 'system',
              status: 'CONFIRMED',
              remarks: data.remarks || 'Payment received via portal',
            }
          });
        }
      });
```

---

## 5. Verification Method

To independently verify the security issues and confirm the effectiveness of these proposed updates:

1. **Verify Files and Code Paths**:
   - Inspect the modified files via `view_file` to ensure correct placement.
2. **Execute Multi-Tenant Integration Tests**:
   - Run the multi-tenant isolation validation suite using:
     ```bash
     npm run test:tenant-isolation
     ```
   - Alternatively, execute the full validation and check suites:
     ```bash
     npm run check
     ```
3. **Write Targeted Test Cases**:
   - In `apps/api/test/tenant-isolation.integration-spec.ts`, add adversarial test cases simulating:
     - Exiting a student using another student's clearance ID.
     - Issuing stock to a department belonging to another tenant.
     - Dispensing medicine using a student ID belonging to a different tenant.
     - Posting a payment using a valid student ID from school A but pointing to a valid invoice ID from school B.
   - Assert that these requests fail with appropriate HTTP status codes (e.g. `400 Bad Request`, `404 Not Found`, or `500/Error` based on client permissions and service boundaries).
