import { crmFetch, CRM_SUB_ACCOUNT_ID } from "./client";
import type { CrmContact, CrmDocument } from "./types";

export async function getCrmContacts(): Promise<CrmContact[]> {
  const res = await crmFetch(
    `contacts?sub_account_id=eq.${CRM_SUB_ACCOUNT_ID}&order=created_at.desc&select=id,sub_account_id,first_name,last_name,email,phone,city,state,country,created_at`
  );
  return res.json();
}

export async function getCrmContact(id: string): Promise<CrmContact> {
  const res = await crmFetch(
    `contacts?id=eq.${id}&sub_account_id=eq.${CRM_SUB_ACCOUNT_ID}&select=id,sub_account_id,first_name,last_name,email,phone,city,state,country,created_at`
  );
  const rows: CrmContact[] = await res.json();
  if (!rows[0]) throw new Error("Contact not found");
  return rows[0];
}

export async function searchCrmContacts(query: string): Promise<CrmContact[]> {
  const q = encodeURIComponent(query);
  const res = await crmFetch(
    `contacts?sub_account_id=eq.${CRM_SUB_ACCOUNT_ID}&or=(first_name.ilike.*${q}*,last_name.ilike.*${q}*,email.ilike.*${q}*,phone.ilike.*${q}*)&order=created_at.desc&limit=50&select=id,sub_account_id,first_name,last_name,email,phone,created_at`
  );
  return res.json();
}

export async function getCrmDocuments(contactId?: string): Promise<CrmDocument[]> {
  let path = `contact_documents?sub_account_id=eq.${CRM_SUB_ACCOUNT_ID}&order=created_at.desc&select=id,sub_account_id,contact_id,file_url,file_type,file_size,uploaded_by,created_at,updated_at`;
  if (contactId) path += `&contact_id=eq.${contactId}`;
  const res = await crmFetch(path);
  return res.json();
}
