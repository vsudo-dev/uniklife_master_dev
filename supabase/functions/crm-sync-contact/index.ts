import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Secrets — set via: supabase secrets set CRM_BASE_URL=... CRM_ANON_KEY=... CRM_EMAIL=... CRM_PASSWORD=...
const CRM_BASE_URL = Deno.env.get("CRM_BASE_URL") ?? "https://myappzbackend.com";
const CRM_ANON_KEY = Deno.env.get("CRM_ANON_KEY") ?? "";
const CRM_EMAIL    = Deno.env.get("CRM_EMAIL") ?? "";
const CRM_PASSWORD = Deno.env.get("CRM_PASSWORD") ?? "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

// In-process JWT cache (lives for the lifetime of this function instance)
let _crmToken: string | null = null;
let _crmTokenExpiry = 0;

async function getCrmToken(): Promise<string> {
  if (_crmToken && Date.now() < _crmTokenExpiry - 60_000) return _crmToken;

  const res = await fetch(`${CRM_BASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: CRM_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: CRM_EMAIL, password: CRM_PASSWORD }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CRM auth failed: ${body}`);
  }

  const data = await res.json();
  _crmToken = data.access_token as string;
  _crmTokenExpiry = Date.now() + (data.expires_in ?? 3600) * 1000;
  return _crmToken;
}

async function crmRequest(
  method: "POST" | "PATCH",
  path: string,
  body: unknown
): Promise<Record<string, unknown> | null> {
  const token = await getCrmToken();
  const res = await fetch(`${CRM_BASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: CRM_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CRM ${res.status}: ${text}`);
  }
  if (method === "POST") {
    const rows = await res.json();
    return Array.isArray(rows) ? (rows[0] ?? null) : rows;
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type, authorization",
      },
    });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: { contact_id: string; tenant_id: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { contact_id, tenant_id } = payload;
  if (!contact_id || !tenant_id) {
    return json({ error: "Missing contact_id or tenant_id" }, 422);
  }

  // Fetch the contact from our DB
  const { data: contact, error: fetchErr } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, phone, city, state, country, crm_contact_id, source")
    .eq("id", contact_id)
    .eq("tenant_id", tenant_id)
    .maybeSingle();

  if (fetchErr) return json({ error: fetchErr.message }, 500);
  if (!contact) return json({ error: "Contact not found" }, 404);

  // Contacts that came FROM CRM don't need to be pushed back (avoid loops)
  if (contact.source === "crm" && contact.crm_contact_id) {
    return json({ ok: true, skipped: "already_from_crm" });
  }

  // Get the tenant's CRM location ID
  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("crm_location_id")
    .eq("id", tenant_id)
    .maybeSingle();

  if (tenantErr) return json({ error: tenantErr.message }, 500);
  if (!tenant?.crm_location_id) {
    return json({ error: "No CRM location mapped for this tenant" }, 422);
  }

  const locationId = tenant.crm_location_id;

  const crmPayload = {
    sub_account_id: locationId,
    first_name: contact.first_name ?? "Unknown",
    last_name: contact.last_name ?? null,
    email: contact.email ?? null,
    phone: contact.phone ?? null,
    city: contact.city ?? null,
    state: contact.state ?? null,
    country: contact.country ?? "IN",
  };

  try {
    if (contact.crm_contact_id) {
      // Update existing CRM contact
      await crmRequest(
        "PATCH",
        `contacts?id=eq.${contact.crm_contact_id}&sub_account_id=eq.${locationId}`,
        crmPayload
      );
      return json({ ok: true, action: "updated", crm_contact_id: contact.crm_contact_id });
    } else {
      // Create new CRM contact
      const created = await crmRequest("POST", "contacts", crmPayload);
      const crmId = created?.id as string | undefined;

      if (crmId) {
        // Store the CRM ID back in our contacts table
        await supabase
          .from("contacts")
          .update({ crm_contact_id: crmId })
          .eq("id", contact_id);
      }

      return json({ ok: true, action: "created", crm_contact_id: crmId ?? null });
    }
  } catch (err) {
    console.error("crm-sync-contact error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
