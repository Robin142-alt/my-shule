import { LiveAuthSession } from "@/lib/dashboard/api-client";
import { withSession } from "@/lib/dashboard/api-client";

export interface ManualFeePayment {
  id: string;
  receipt_number: string;
  payment_method: string;
  amount_minor: string;
  payer_name: string;
  deposit_reference: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  student_id: string;
  invoice_number: string;
  total_amount_minor: string;
  balance_minor: string;
  status: string;
  due_date: string;
  created_at: string;
}

export interface AccountOverview {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_name: string;
  balance_minor: string;
}

export async function fetchCollectionsLive(session: LiveAuthSession): Promise<ManualFeePayment[]> {
  return withSession(session, "/finance/collections", {
    method: "GET",
  });
}

export async function fetchInvoicesLive(session: LiveAuthSession): Promise<Invoice[]> {
  return withSession(session, "/finance/invoices", {
    method: "GET",
  });
}

export async function fetchAccountsOverviewLive(session: LiveAuthSession): Promise<AccountOverview[]> {
  return withSession(session, "/finance/accounts-overview", {
    method: "GET",
  });
}

export async function fetchExpensesLive(session: LiveAuthSession): Promise<any[]> {
  return withSession(session, "/finance/expenses", {
    method: "GET",
  });
}

export async function fetchBankEntriesLive(session: LiveAuthSession): Promise<any[]> {
  return withSession(session, "/finance/bank-entries", {
    method: "GET",
  });
}
