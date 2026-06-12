import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  console.log('--- Starting Finance Billing Cycle Test ---');
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/myshule',
  });
  await client.connect();

  try {
    const tenantId = 'TENANT-001';
    
    // 1. Create a dummy class and student if not exist
    console.log('[1/7] Ensuring a student exists...');
    let studentId = '11111111-1111-1111-1111-111111111111';
    await client.query(`
      INSERT INTO students (id, tenant_id, first_name, last_name, admission_number, date_of_birth, gender, status, metadata)
      VALUES ($1, $2, 'Jane', 'Doe', 'ADM-FIN-001', '2015-01-01', 'female', 'active', '{"grade_level": "Grade 5"}')
      ON CONFLICT (id) DO NOTHING;
    `, [studentId, tenantId]);

    // 2. Accountant creates fee structure
    console.log('[2/7] Creating fee structure...');
    const fsRes = await client.query(`
      INSERT INTO fee_structures (id, tenant_id, name, academic_year, term, grade_level, total_amount_minor, status, line_items)
      VALUES ($1, $2, 'Term 1 Grade 5 Fee', '2026', 'Term 1', 'Grade 5', 2500000, 'active', '[{"name": "Tuition", "amount_minor": 2500000}]'::jsonb)
      ON CONFLICT (tenant_id, academic_year, term, grade_level, (COALESCE(class_name, ''))) WHERE status = 'active'
      DO UPDATE SET total_amount_minor = EXCLUDED.total_amount_minor
      RETURNING id;
    `, ['55555555-5555-5555-5555-555555555555', tenantId]);
    const fsId = fsRes.rows[0].id;
    console.log(`      Fee structure ID: ${fsId}`);

    // 3. Generate Invoices
    console.log('[3/7] Generating invoices for the fee structure...');
    const invRes = await client.query(`
      INSERT INTO student_invoices (tenant_id, student_id, invoice_number, fee_structure_id, term, academic_year, amount_minor, balance_minor)
      VALUES ($1, $2, $3, $4, 'Term 1', '2026', 2500000, 2500000)
      RETURNING id, invoice_number;
    `, [tenantId, studentId, `INV-TEST-${Date.now()}`, fsId]);
    const invoiceId = invRes.rows[0].id;
    console.log(`      Generated invoice: ${invRes.rows[0].invoice_number} for KES 25,000`);

    // 4. Parent views balance
    console.log('[4/7] Simulating Parent Portal fetching fees...');
    const feesRes = await client.query(`
      SELECT balance_minor FROM student_invoices WHERE student_id = $1 AND status != 'paid'
    `, [studentId]);
    let totalOutstanding = feesRes.rows.reduce((sum, r) => sum + Number(r.balance_minor), 0);
    console.log(`      Parent sees outstanding balance: KES ${totalOutstanding / 100}`);

    // 5. Parent pays (M-Pesa or manual)
    console.log('[5/7] Simulating payment of KES 10,000...');
    const paymentMinor = 1000000;
    
    // Create receipt
    const recRes = await client.query(`
      INSERT INTO receipts (tenant_id, receipt_number, student_id, payment_id, amount_minor, payment_method)
      VALUES ($1, $2, $3, $4, $5, 'mpesa')
      RETURNING id, receipt_number;
    `, [tenantId, `RCPT-${Date.now()}`, studentId, '44444444-4444-4444-4444-444444444444', paymentMinor]);
    
    // Update invoice balance
    const updatedInv = await client.query(`
      UPDATE student_invoices SET balance_minor = balance_minor - $1, status = CASE WHEN balance_minor - $1 <= 0 THEN 'paid' ELSE 'open' END
      WHERE id = $2 RETURNING balance_minor, status;
    `, [paymentMinor, invoiceId]);
    
    console.log(`      Receipt created: ${recRes.rows[0].receipt_number}`);
    console.log(`      Invoice new balance: KES ${updatedInv.rows[0].balance_minor / 100} (Status: ${updatedInv.rows[0].status})`);

    // 6. Parent requests a waiver
    console.log('[6/7] Parent requests waiver of KES 5,000...');
    const waiverMinor = 500000;
    const wvrRes = await client.query(`
      INSERT INTO tenant_pending_waivers (tenant_id, waiver_number, student_id, student_name, class_name, amount_minor, reason, status)
      VALUES ($1, $2, $3, 'Jane Doe', 'Grade 5', $4, 'Bursary', 'pending')
      RETURNING id, waiver_number;
    `, [tenantId, `WVR-${Date.now()}`, studentId, waiverMinor]);
    const waiverId = wvrRes.rows[0].id;

    // 7. Principal approves waiver
    console.log('[7/7] Approving waiver and applying to balance...');
    await client.query(`UPDATE tenant_pending_waivers SET status = 'approved' WHERE id = $1`, [waiverId]);
    
    const finalInv = await client.query(`
      UPDATE student_invoices SET balance_minor = balance_minor - $1, status = CASE WHEN balance_minor - $1 <= 0 THEN 'paid' ELSE 'open' END
      WHERE id = $2 RETURNING balance_minor, status;
    `, [waiverMinor, invoiceId]);
    console.log(`      Final invoice balance: KES ${finalInv.rows[0].balance_minor / 100} (Status: ${finalInv.rows[0].status})`);

    console.log('--- Test Passed ---');

  } catch (err) {
    console.error('Test Failed:', err);
  } finally {
    await client.end();
  }
}

run();
