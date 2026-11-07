// CRM-side types — these map to MyAppz (myappzbackend.com) tables.
// Column names verified against CRM_ANALYSIS.md public schema.

export interface CrmContact {
  id: string;
  sub_account_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  created_at: string;
}

export interface CrmBooking {
  id: string;
  sub_account_id: string;
  contact_id: string | null;
  start_time: string;
  end_time: string | null;
  status: string;
  created_at: string;
}

export interface CrmInvoice {
  id: string;
  sub_account_id: string;
  contact_id: string | null;
  invoice_number: string | null;
  amount: number;
  currency: string | null;
  status: string;
  due_date: string | null;
  issued_at: string | null;
  created_at: string;
}

export interface CrmPayment {
  id: string;
  invoice_id: string | null;
  sub_account_id: string;
  amount: number;
  currency: string | null;
  payment_method: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
}

export interface CrmDocument {
  id: string;
  sub_account_id: string | null;
  contact_id: string | null;
  file_url: string | null;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string | null;
}
