import type { InvoiceStatus } from "./wellness";

export type PaymentMethod = "cash" | "card" | "upi" | "bank_transfer" | "cheque" | "other";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  tenant_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  service_id: string | null;
  program_id: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  tenant_id: string;
  invoice_id: string;
  contact_id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  reference_no: string | null;
  payment_date: string;
  notes: string | null;
  recorded_by: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  contact_id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  invoice_items?: InvoiceItem[];
  payments?: Payment[];
  contacts?: { first_name: string; last_name: string | null; email: string | null };
}

export interface InvoiceSummary {
  id: string;
  tenant_id: string;
  contact_id: string;
  invoice_number: string;
  total_amount: number;
  currency: string;
  status: InvoiceStatus;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  paid_amount: number;
  outstanding_amount: number;
}

export interface CreateInvoiceInput {
  tenant_id: string;
  contact_id: string;
  invoice_number: string;
  amount: number;
  currency?: string;
  due_date?: string;
  notes?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    service_id?: string;
    program_id?: string;
  }>;
}

export interface RecordPaymentInput {
  tenant_id: string;
  invoice_id: string;
  contact_id: string;
  amount: number;
  method: PaymentMethod;
  payment_date: string;
  reference_no?: string;
  notes?: string;
  recorded_by: string;
}
