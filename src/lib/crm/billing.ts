import { crmFetch, CRM_SUB_ACCOUNT_ID } from "./client";
import type { CrmInvoice, CrmPayment } from "./types";

export async function getCrmInvoices(opts?: {
  contactId?: string;
  status?: string;
}): Promise<CrmInvoice[]> {
  let path = `payment_receipts?sub_account_id=eq.${CRM_SUB_ACCOUNT_ID}&order=created_at.desc&select=id,sub_account_id,contact_id,invoice_number,amount,currency,status,due_date,issued_at,created_at`;
  if (opts?.contactId) path += `&contact_id=eq.${opts.contactId}`;
  if (opts?.status) path += `&status=eq.${opts.status}`;
  const res = await crmFetch(path);
  return res.json();
}

export async function getCrmInvoice(id: string): Promise<CrmInvoice> {
  const res = await crmFetch(
    `payment_receipts?id=eq.${id}&sub_account_id=eq.${CRM_SUB_ACCOUNT_ID}&select=id,sub_account_id,contact_id,invoice_number,amount,currency,status,due_date,issued_at,created_at`
  );
  const rows: CrmInvoice[] = await res.json();
  if (!rows[0]) throw new Error("Invoice not found");
  return rows[0];
}

export async function getCrmPayments(invoiceId: string): Promise<CrmPayment[]> {
  const res = await crmFetch(
    `payment_gateway_transactions?sub_account_id=eq.${CRM_SUB_ACCOUNT_ID}&invoice_id=eq.${invoiceId}&order=created_at.desc&select=id,invoice_id,sub_account_id,amount,currency,payment_method,status,paid_at,created_at`
  );
  return res.json();
}

export async function getCrmRevenueSummary(): Promise<{
  total: number;
  paid: number;
  outstanding: number;
  overdue: number;
}> {
  const res = await crmFetch(
    `payment_receipts?sub_account_id=eq.${CRM_SUB_ACCOUNT_ID}&select=amount,status`
  );
  const rows: { amount: number; status: string }[] = await res.json();
  return {
    total: rows.reduce((s, r) => s + (r.amount ?? 0), 0),
    paid: rows.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0),
    outstanding: rows.filter((r) => ["sent", "partial"].includes(r.status)).reduce((s, r) => s + r.amount, 0),
    overdue: rows.filter((r) => r.status === "overdue").reduce((s, r) => s + r.amount, 0),
  };
}
