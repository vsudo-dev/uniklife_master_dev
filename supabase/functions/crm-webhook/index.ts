import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Set via: supabase secrets set CRM_WEBHOOK_SECRET=<your-webhooks-api-key>
const WEBHOOK_SECRET = Deno.env.get("CRM_WEBHOOK_SECRET") ?? "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-webhook-key, authorization" },
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Validate webhook secret — CRM may send it as Bearer, x-webhook-key, or x-api-key
  if (WEBHOOK_SECRET) {
    const auth = req.headers.get("authorization") ?? "";
    const key =
      (auth.startsWith("Bearer ") ? auth.slice(7) : "") ||
      req.headers.get("x-webhook-key") ||
      req.headers.get("x-api-key") ||
      "";
    if (key !== WEBHOOK_SECRET) {
      return json({ error: "Unauthorized" }, 401);
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  // Normalise event type — CRM platforms use different naming conventions
  const eventType =
    (payload.type as string) ??
    (payload.event as string) ??
    (payload.event_type as string) ??
    "";

  const isContactEvent =
    /contact\.(created|updated|create|update)/i.test(eventType) ||
    /ContactCreate|ContactUpdate/i.test(eventType);

  const isAppointmentEvent =
    /appointment\.(created|updated|create|update)/i.test(eventType) ||
    /AppointmentCreate|AppointmentUpdate/i.test(eventType);

  const isInvoiceEvent =
    /invoice\.(created|updated|create|update)/i.test(eventType) ||
    /InvoiceCreate|InvoiceUpdate|payment\.(created|updated)/i.test(eventType);

  if (!isContactEvent && !isAppointmentEvent && !isInvoiceEvent) {
    // Acknowledge unknown events so the CRM doesn't retry
    console.log("crm-webhook: unhandled event", eventType);
    return json({ ok: true, skipped: eventType });
  }

  // Resolve tenant from CRM location/sub-account ID
  const locationId =
    (payload.locationId as string) ??
    (payload.location_id as string) ??
    (payload.sub_account_id as string) ??
    "";

  if (!locationId) {
    return json({ error: "Missing locationId in payload" }, 422);
  }

  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .select("id, crm_contact_tag, crm_tag_strict_mode")
    .eq("crm_location_id", locationId)
    .maybeSingle();

  if (tenantErr) return json({ error: tenantErr.message }, 500);
  if (!tenant) {
    // Not configured yet — log and ack so CRM doesn't hammer us
    console.warn("crm-webhook: no tenant mapped to locationId", locationId);
    return json({ ok: true, skipped: "tenant_not_mapped" });
  }

  // Tag filter — contact events only
  // strict_mode=true : no tags in payload = skip (requires explicit tag)
  // strict_mode=false: no tags in payload = sync anyway (safe fallback for CRM webhook bugs)
  if (isContactEvent && tenant.crm_contact_tag) {
    const rawTags = payload.tags as string[] | { name: string }[] | null | undefined;
    const tagNames = Array.isArray(rawTags)
      ? rawTags.map((t) => (typeof t === "string" ? t : (t as { name: string }).name ?? "").toLowerCase())
      : [];
    const hasRequiredTag = tagNames.includes(tenant.crm_contact_tag.toLowerCase());
    const tagsAbsent = tagNames.length === 0;

    if (!hasRequiredTag) {
      if (tenant.crm_tag_strict_mode || !tagsAbsent) {
        // Strict mode: always skip if tag missing
        // Safe mode: skip only if tags were present but wrong (not absent)
        console.log("crm-webhook: contact skipped — tag not matched", {
          required: tenant.crm_contact_tag,
          found: tagNames,
          strict: tenant.crm_tag_strict_mode,
        });
        return json({ ok: true, skipped: "tag_not_matched" });
      }
      console.log("crm-webhook: tags absent in payload — syncing (safe fallback)", { required: tenant.crm_contact_tag });
    }
  }

  // Map CRM contact fields → our contacts schema
  // Handle both camelCase (GHL-style) and snake_case payloads
  const firstName =
    (payload.firstName as string) ?? (payload.first_name as string) ?? "";
  const contact = {
    tenant_id: tenant.id,
    crm_contact_id: (payload.id as string) ?? (payload.contact_id as string),
    first_name: firstName || "Unknown",
    last_name:
      (payload.lastName as string) ?? (payload.last_name as string) ?? null,
    email: (payload.email as string) ?? null,
    phone:
      (payload.phone as string) ?? (payload.phoneNumber as string) ?? null,
    city: (payload.city as string) ?? null,
    state: (payload.state as string) ?? null,
    country: (payload.country as string) ?? "IN",
    source: "crm",
    updated_at: new Date().toISOString(),
  };

  if (!contact.crm_contact_id) {
    return json({ error: "Missing contact id in payload" }, 422);
  }

  // Manual upsert — partial unique index can't be used by PostgREST ON CONFLICT
  const { data: existing } = await supabase
    .from("contacts")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("crm_contact_id", contact.crm_contact_id)
    .maybeSingle();

  if (existing) {
    const { error: updateErr } = await supabase
      .from("contacts")
      .update({ ...contact, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (updateErr) {
      console.error("crm-webhook: update failed", updateErr);
      return json({ error: updateErr.message }, 500);
    }
  } else {
    const { error: insertErr } = await supabase.from("contacts").insert(contact);
    if (insertErr) {
      console.error("crm-webhook: insert failed", insertErr);
      return json({ error: insertErr.message }, 500);
    }
  }

  if (isContactEvent) {
    return json({ ok: true, event: eventType });
  }

  // ── Appointment events ────────────────────────────────────────────────────
  if (isAppointmentEvent) {
    const apptId =
      (payload.id as string) ??
      (payload.appointment_id as string) ??
      (payload.appointmentId as string);

    if (!apptId) return json({ error: "Missing appointment id" }, 422);

    const scheduledAt =
      (payload.startTime as string) ??
      (payload.start_time as string) ??
      (payload.scheduled_at as string);

    if (!scheduledAt) return json({ error: "Missing scheduled_at" }, 422);

    const apptContactId =
      (payload.contactId as string) ??
      (payload.contact_id as string) ??
      "";

    // Try to find the matched contact in our DB
    let ourContactId: string | null = null;
    if (apptContactId) {
      const { data: mc } = await supabase
        .from("contacts")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("crm_contact_id", apptContactId)
        .maybeSingle();
      ourContactId = mc?.id ?? null;
    }

    const apptRow = {
      tenant_id: tenant.id,
      contact_id: ourContactId,
      crm_appointment_id: apptId,
      crm_contact_id: apptContactId || null,
      title:
        (payload.title as string) ??
        (payload.name as string) ??
        (payload.service_name as string) ??
        "Appointment",
      status:
        (payload.status as string) ?? "scheduled",
      scheduled_at: scheduledAt,
      end_at:
        (payload.endTime as string) ??
        (payload.end_time as string) ??
        null,
      calendar_id:
        (payload.calendarId as string) ??
        (payload.calendar_id as string) ??
        null,
      staff_name:
        (payload.assignedUserId as string) ??
        (payload.staff_name as string) ??
        null,
      notes: (payload.notes as string) ?? null,
      source: "crm",
      raw: payload,
      updated_at: new Date().toISOString(),
    };

    const { data: existingAppt } = await supabase
      .from("crm_appointments")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("crm_appointment_id", apptId)
      .maybeSingle();

    if (existingAppt) {
      const { error: updErr } = await supabase
        .from("crm_appointments")
        .update(apptRow)
        .eq("id", existingAppt.id);
      if (updErr) return json({ error: updErr.message }, 500);
    } else {
      const { error: insErr } = await supabase.from("crm_appointments").insert(apptRow);
      if (insErr) return json({ error: insErr.message }, 500);
    }

    return json({ ok: true, event: eventType });
  }

  // ── Invoice events ────────────────────────────────────────────────────────
  if (isInvoiceEvent) {
    const invId =
      (payload.id as string) ??
      (payload.invoice_id as string) ??
      (payload.invoiceId as string);

    if (!invId) return json({ error: "Missing invoice id" }, 422);

    const invContactId =
      (payload.contactId as string) ??
      (payload.contact_id as string) ??
      "";

    let ourContactId: string | null = null;
    if (invContactId) {
      const { data: mc } = await supabase
        .from("contacts")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("crm_contact_id", invContactId)
        .maybeSingle();
      ourContactId = mc?.id ?? null;
    }

    const invRow = {
      tenant_id: tenant.id,
      contact_id: ourContactId,
      crm_invoice_id: invId,
      crm_contact_id: invContactId || null,
      invoice_number:
        (payload.invoiceNumber as string) ??
        (payload.invoice_number as string) ??
        null,
      amount: Number(
        (payload.amount as string | number) ??
        (payload.total as string | number) ??
        0
      ),
      currency:
        (payload.currency as string) ?? "INR",
      status:
        (payload.status as string) ?? "draft",
      due_date:
        (payload.dueDate as string) ??
        (payload.due_date as string) ??
        null,
      paid_at:
        (payload.paidAt as string) ??
        (payload.paid_at as string) ??
        null,
      source: "crm",
      raw: payload,
      updated_at: new Date().toISOString(),
    };

    const { data: existingInv } = await supabase
      .from("crm_invoices")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("crm_invoice_id", invId)
      .maybeSingle();

    if (existingInv) {
      const { error: updErr } = await supabase
        .from("crm_invoices")
        .update(invRow)
        .eq("id", existingInv.id);
      if (updErr) return json({ error: updErr.message }, 500);
    } else {
      const { error: insErr } = await supabase.from("crm_invoices").insert(invRow);
      if (insErr) return json({ error: insErr.message }, 500);
    }

    return json({ ok: true, event: eventType });
  }

  return json({ ok: true, skipped: eventType });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
