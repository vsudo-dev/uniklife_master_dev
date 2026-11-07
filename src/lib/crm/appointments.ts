import { crmFetch, CRM_SUB_ACCOUNT_ID } from "./client";
import type { CrmBooking } from "./types";

export async function getCrmBookings(opts?: {
  from?: string;
  to?: string;
  contactId?: string;
  status?: string;
}): Promise<CrmBooking[]> {
  let path = `calendar_bookings?sub_account_id=eq.${CRM_SUB_ACCOUNT_ID}&order=start_time.desc&select=id,sub_account_id,contact_id,start_time,end_time,status,created_at`;
  if (opts?.from) path += `&start_time=gte.${opts.from}`;
  if (opts?.to) path += `&start_time=lte.${opts.to}`;
  if (opts?.contactId) path += `&contact_id=eq.${opts.contactId}`;
  if (opts?.status) path += `&status=eq.${opts.status}`;
  const res = await crmFetch(path);
  return res.json();
}

export async function getCrmBooking(id: string): Promise<CrmBooking> {
  const res = await crmFetch(
    `calendar_bookings?id=eq.${id}&sub_account_id=eq.${CRM_SUB_ACCOUNT_ID}&select=id,sub_account_id,contact_id,start_time,end_time,status,created_at`
  );
  const rows: CrmBooking[] = await res.json();
  if (!rows[0]) throw new Error("Booking not found");
  return rows[0];
}
