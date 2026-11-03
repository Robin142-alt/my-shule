import { FEE_CREDIT_READ_SQL } from "../billing/fee-credit-read-sql";
import { FEE_RECEIPTS_READ_SQL } from "../billing/fee-receipts-read-sql";

export const PRINCIPAL_FEE_BALANCES_SQL = `/* overview:finance */
          WITH receipts AS (SELECT * FROM (${FEE_RECEIPTS_READ_SQL}) receipts),
          balances AS (
            SELECT metadata->>'student_id' AS student_id,
              SUM(GREATEST(total_amount_minor-amount_paid_minor,0)) AS amount
            FROM invoices WHERE tenant_id=$1 AND NULLIF(metadata->>'student_id','') IS NOT NULL
              AND status NOT IN ('draft','paid','void','uncollectible') GROUP BY metadata->>'student_id'
          ), credits AS (
            SELECT student_id, SUM(amount_minor) AS amount FROM (${FEE_CREDIT_READ_SQL}) credits
            WHERE tenant_id=$1 GROUP BY student_id
          )
          SELECT (SELECT COALESCE(SUM(amount_minor),0)::text FROM receipts
            WHERE tenant_id=$1 AND status='cleared'
              AND timezone('Africa/Nairobi',COALESCE(cleared_at,received_at))::date=timezone('Africa/Nairobi',NOW())::date
          ) AS collected_today_minor,
          (SELECT COALESCE(SUM(GREATEST(balances.amount-COALESCE(credits.amount,0),0)),0)::text
            FROM balances LEFT JOIN credits USING(student_id)) AS arrears_minor
        `;
