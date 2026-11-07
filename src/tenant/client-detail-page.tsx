import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useAuthStore } from "@/hooks/use-auth";
import { useCreateWellnessClient, useUpdateWellnessStatus } from "@/hooks/use-wellness-clients";
import {
  useHealthAssessments,
  useHealthMeasurements,
  useLogMeasurement,
  useCarePlans,
  useCreateCarePlan,
} from "@/hooks/use-health";
import { useEnrollments } from "@/hooks/use-programs";
import {
  useMealPlans,
  useNutritionEntries,
  useLogNutritionEntry,
  useCreateMealPlan,
} from "@/hooks/use-nutrition";
import type { HealthMeasurement, CarePlan, MealType } from "@/types";
import { supabase } from "@/lib/supabase";

type Tab = "overview" | "assessments" | "progress" | "plans" | "programs" | "appointments" | "nutrition" | "invoices";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "assessments", label: "Assessments" },
  { id: "progress", label: "Progress" },
  { id: "plans", label: "Care Plans" },
  { id: "programs", label: "Programs" },
  { id: "appointments", label: "Appointments" },
  { id: "nutrition", label: "Nutrition" },
  { id: "invoices", label: "Invoices" },
];

// ── Queries ──────────────────────────────────────────────────────────────────

function useContact(contactId: string) {
  return useQuery({
    queryKey: ["contact", contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email, phone, city, state, date_of_birth, tenant_id")
        .eq("id", contactId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function useWellnessProfile(contactId: string) {
  return useQuery({
    queryKey: ["wellness-profile", contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wellness_clients")
        .select("*")
        .eq("contact_id", contactId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function ClientDetailPage({ tenantId }: { tenantId: string }) {
  const { clientId } = useParams<{ clientId: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");

  const { data: contact, isLoading: loadingContact } = useContact(clientId!);
  const { data: profile, isLoading: loadingProfile } = useWellnessProfile(clientId!);
  const createWellnessClient = useCreateWellnessClient();
  const updateStatus = useUpdateWellnessStatus();

  async function handleActivate() {
    await createWellnessClient.mutateAsync({
      tenant_id: tenantId,
      contact_id: clientId!,
    });
    qc.invalidateQueries({ queryKey: ["wellness-profile", clientId] });
  }

  function handleStatusChange(status: string) {
    if (!profile) return;
    updateStatus.mutate({ id: profile.id, status });
  }

  if (loadingContact || loadingProfile) {
    return <div className="p-6 text-sm text-gray-500">Loading client...</div>;
  }
  if (!contact) {
    return <div className="p-6 text-sm text-red-500">Client not found.</div>;
  }

  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  const initials = `${contact.first_name?.[0] ?? ""}${contact.last_name?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <div className="p-4 sm:p-6">
      {/* Contact header */}
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-royal-blue text-lg font-bold text-white flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-900">{fullName}</h1>
          <div className="mt-1 flex flex-wrap gap-4 text-sm text-gray-500">
            {contact.email && <span>{contact.email}</span>}
            {contact.phone && <span>{contact.phone}</span>}
            {contact.date_of_birth && (
              <span>DOB: {new Date(contact.date_of_birth).toLocaleDateString("en-IN")}</span>
            )}
            {contact.city && (
              <span>{[contact.city, contact.state].filter(Boolean).join(", ")}</span>
            )}
          </div>
        </div>
        {profile && (
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
              profile.enrollment_status === "active"      ? "bg-green-100 text-green-800" :
              profile.enrollment_status === "registered"  ? "bg-blue-100 text-blue-800" :
              profile.enrollment_status === "suspended"   ? "bg-amber-100 text-amber-800" :
              profile.enrollment_status === "deactivated" ? "bg-gray-100 text-gray-500" :
              "bg-gray-100 text-gray-700"
            }`}>
              {profile.enrollment_status}
            </span>
            <div className="flex gap-1">
              {(profile.enrollment_status === "active" || profile.enrollment_status === "registered") && (
                <>
                  <button onClick={() => handleStatusChange("suspended")} disabled={updateStatus.isPending}
                    className="rounded px-2 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-50 border border-amber-200">
                    Suspend
                  </button>
                  <button onClick={() => handleStatusChange("deactivated")} disabled={updateStatus.isPending}
                    className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 border border-red-200">
                    Deactivate
                  </button>
                </>
              )}
              {profile.enrollment_status === "suspended" && (
                <>
                  <button onClick={() => handleStatusChange("active")} disabled={updateStatus.isPending}
                    className="rounded px-2 py-1 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50 border border-green-200">
                    Reactivate
                  </button>
                  <button onClick={() => handleStatusChange("deactivated")} disabled={updateStatus.isPending}
                    className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 border border-red-200">
                    Deactivate
                  </button>
                </>
              )}
              {profile.enrollment_status === "deactivated" && (
                <button onClick={() => handleStatusChange("active")} disabled={updateStatus.isPending}
                  className="rounded px-2 py-1 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50 border border-green-200">
                  Reactivate
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* No wellness profile yet */}
      {!profile ? (
        <div className="space-y-6">
          {/* Activate card */}
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <UserPlus className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">No Wellness Profile Yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              This contact came from the CRM. Activate their wellness profile to start tracking health data,
              care plans, measurements, and nutrition.
            </p>
            <button
              onClick={handleActivate}
              disabled={createWellnessClient.isPending}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-royal-blue px-5 py-2 text-sm font-medium text-white hover:bg-royal-blue-light disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              {createWellnessClient.isPending ? "Activating…" : "Activate Wellness Profile"}
            </button>
            {createWellnessClient.isError && (
              <p className="mt-2 text-xs text-red-600">{(createWellnessClient.error as Error).message}</p>
            )}
          </div>

          {/* CRM appointments for this contact */}
          <ContactCrmAppointments contactId={clientId!} tenantId={tenantId} />
        </div>
      ) : (
        /* Full wellness profile view */
        <>
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex gap-6 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`whitespace-nowrap pb-3 text-sm font-medium transition-colors ${
                    tab === t.id
                      ? "border-b-2 border-royal-blue text-royal-blue"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          {tab === "overview"      && <OverviewTab profile={profile} tenantId={tenantId} />}
          {tab === "assessments"   && <AssessmentsTab clientId={profile.id} />}
          {tab === "progress"      && <ProgressTab clientId={profile.id} tenantId={tenantId} />}
          {tab === "plans"         && <CarePlansTab clientId={profile.id} tenantId={tenantId} />}
          {tab === "programs"      && <ProgramsTab clientId={profile.id} />}
          {tab === "appointments"  && <ContactCrmAppointments contactId={clientId!} tenantId={tenantId} />}
          {tab === "nutrition"     && <NutritionTab clientId={profile.id} tenantId={tenantId} />}
          {tab === "invoices"      && <ContactCrmInvoices contactId={clientId!} tenantId={tenantId} />}
        </>
      )}
    </div>
  );
}

// ── CRM Appointments (for both states — with and without wellness profile) ───

function ContactCrmAppointments({ contactId, tenantId }: { contactId: string; tenantId: string }) {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ["crm_appts_contact", tenantId, contactId],
    enabled: !!contactId && !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_appointments")
        .select("id, title, status, scheduled_at, end_at, staff_name")
        .eq("tenant_id", tenantId)
        .eq("contact_id", contactId)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const STATUS_COLORS: Record<string, string> = {
    confirmed: "bg-indigo-100 text-indigo-800",
    scheduled: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-700",
    no_show: "bg-orange-100 text-orange-800",
    pending: "bg-yellow-100 text-yellow-800",
  };

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-gray-900">
        Appointments {appointments?.length ? `(${appointments.length})` : ""}
      </h3>
      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : !appointments?.length ? (
        <p className="text-sm text-gray-500">No appointments found for this client.</p>
      ) : (
        <div className="space-y-2">
          {appointments.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{a.title ?? "Appointment"}</p>
                <p className="text-xs text-gray-500">
                  {new Date(a.scheduled_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  {a.staff_name ? ` · ${a.staff_name}` : ""}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[a.status] ?? "bg-gray-100 text-gray-700"}`}>
                {a.status.replace(/_/g, " ")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── CRM Invoices ─────────────────────────────────────────────────────────────

function ContactCrmInvoices({ contactId, tenantId }: { contactId: string; tenantId: string }) {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ["crm_invoices_contact", tenantId, contactId],
    enabled: !!contactId && !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_invoices")
        .select("id, invoice_number, amount, currency, status, due_date, paid_at")
        .eq("tenant_id", tenantId)
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const STATUS_COLORS: Record<string, string> = {
    paid:      "bg-green-100 text-green-800",
    sent:      "bg-blue-100 text-blue-800",
    draft:     "bg-gray-100 text-gray-700",
    overdue:   "bg-red-100 text-red-700",
    cancelled: "bg-orange-100 text-orange-800",
  };

  const total = invoices?.reduce((s, i) => s + (i.amount ?? 0), 0) ?? 0;
  const currency = invoices?.[0]?.currency ?? "INR";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Invoices {invoices?.length ? `(${invoices.length})` : ""}
        </h3>
        {invoices?.length ? (
          <span className="text-xs text-gray-500">Total: {currency} {total.toLocaleString("en-IN")}</span>
        ) : null}
      </div>
      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : !invoices?.length ? (
        <p className="text-sm text-gray-500">No invoices found for this client.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Invoice #", "Amount", "Status", "Due Date", "Paid On"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.invoice_number ?? "—"}</td>
                  <td className="px-4 py-3 text-sm">{currency} {(inv.amount ?? 0).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[inv.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString("en-IN") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────

function OverviewTab({ profile }: { profile: NonNullable<ReturnType<typeof useWellnessProfile>["data"]>; tenantId: string }) {
  const { data: measurements } = useHealthMeasurements(profile.id);
  const latest = measurements?.[0];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Wellness Details</h3>
        <dl className="space-y-3">
          {[
            { label: "Emergency Contact", value: profile.emergency_contact_name },
            { label: "Emergency Phone",   value: profile.emergency_contact_phone },
            { label: "Blood Type",        value: profile.blood_type },
            { label: "Lifestyle Notes",   value: profile.lifestyle_notes },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <dt className="text-gray-500">{label}</dt>
              <dd className="font-medium text-gray-900">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Latest Vitals</h3>
        {latest ? (
          <>
            <dl className="grid grid-cols-2 gap-3">
              {[
                { label: "Weight",    value: latest.weight_kg ? `${latest.weight_kg} kg` : null },
                { label: "BMI",       value: latest.bmi?.toString() },
                { label: "Waist",     value: latest.waist_cm ? `${latest.waist_cm} cm` : null },
                { label: "Body Fat",  value: latest.body_fat_pct ? `${latest.body_fat_pct}%` : null },
                { label: "BP",        value: latest.blood_pressure_systolic ? `${latest.blood_pressure_systolic}/${latest.blood_pressure_diastolic}` : null },
                { label: "Resting HR", value: latest.resting_heart_rate ? `${latest.resting_heart_rate} bpm` : null },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs text-gray-500">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-gray-900">{value ?? "—"}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-gray-400">
              Recorded {new Date(latest.measurement_date).toLocaleDateString("en-IN")}
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-500">No measurements recorded yet.</p>
        )}
      </div>
    </div>
  );
}

// ── Assessments ───────────────────────────────────────────────────────────────

function AssessmentsTab({ clientId }: { clientId: string }) {
  const { data: assessments, isLoading } = useHealthAssessments(clientId);
  if (isLoading) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div className="space-y-3">
      {!assessments?.length ? (
        <p className="text-sm text-gray-500">No health assessments yet.</p>
      ) : assessments.map((a) => (
        <div key={a.id} className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 capitalize">{a.assessment_type.replace("_", " ")} Assessment</p>
              <p className="text-xs text-gray-500">{new Date(a.created_at).toLocaleDateString("en-IN")}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
              a.status === "approved" ? "bg-green-100 text-green-800" :
              a.status === "reviewed" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"
            }`}>
              {a.status}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            {a.height_cm          && <div><p className="text-xs text-gray-500">Height</p><p className="font-medium">{a.height_cm} cm</p></div>}
            {a.initial_weight_kg  && <div><p className="text-xs text-gray-500">Weight</p><p className="font-medium">{a.initial_weight_kg} kg</p></div>}
            {a.bmi                && <div><p className="text-xs text-gray-500">BMI</p><p className="font-medium">{a.bmi}</p></div>}
          </div>
          {a.practitioner_notes && (
            <p className="mt-3 text-xs text-gray-600 border-t pt-2">{a.practitioner_notes}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Progress ──────────────────────────────────────────────────────────────────

function ProgressTab({ clientId, tenantId }: { clientId: string; tenantId: string }) {
  const { user } = useAuthStore();
  const { data: measurements, isLoading } = useHealthMeasurements(clientId);
  const logMeasurement = useLogMeasurement();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    measurement_date: new Date().toISOString().slice(0, 10),
    weight_kg: "", waist_cm: "", hip_cm: "", bmi: "",
    body_fat_pct: "", blood_pressure_systolic: "", blood_pressure_diastolic: "",
    resting_heart_rate: "", notes: "",
  });

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    await logMeasurement.mutateAsync({
      tenant_id: tenantId, client_id: clientId, recorded_by: user?.id ?? "",
      measurement_date: form.measurement_date,
      weight_kg:              form.weight_kg              ? Number(form.weight_kg)              : undefined,
      waist_cm:               form.waist_cm               ? Number(form.waist_cm)               : undefined,
      hip_cm:                 form.hip_cm                 ? Number(form.hip_cm)                 : undefined,
      bmi:                    form.bmi                    ? Number(form.bmi)                    : undefined,
      body_fat_pct:           form.body_fat_pct           ? Number(form.body_fat_pct)           : undefined,
      blood_pressure_systolic: form.blood_pressure_systolic ? Math.round(Number(form.blood_pressure_systolic)) : undefined,
      blood_pressure_diastolic: form.blood_pressure_diastolic ? Math.round(Number(form.blood_pressure_diastolic)) : undefined,
      resting_heart_rate:     form.resting_heart_rate     ? Math.round(Number(form.resting_heart_rate))     : undefined,
      notes: form.notes || undefined,
    });
    setShowForm(false);
  }

  if (isLoading) return <p className="text-sm text-gray-500">Loading...</p>;

  const weights = measurements?.filter((m) => m.weight_kg).map((m) => ({ date: m.measurement_date, val: m.weight_kg! })).reverse() ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium text-gray-700">Measurements ({measurements?.length ?? 0} records)</p>
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-royal-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-royal-blue-light">
          + Log Measurement
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleLog} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <p className="text-sm font-medium text-gray-900">New Measurement</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Date", field: "measurement_date", type: "date", integer: false },
              { label: "Weight (kg)", field: "weight_kg", type: "number", integer: false },
              { label: "Waist (cm)", field: "waist_cm", type: "number", integer: false },
              { label: "Hip (cm)", field: "hip_cm", type: "number", integer: false },
              { label: "BMI", field: "bmi", type: "number", integer: false },
              { label: "Body Fat %", field: "body_fat_pct", type: "number", integer: false },
              { label: "BP Systolic", field: "blood_pressure_systolic", type: "number", integer: true },
              { label: "BP Diastolic", field: "blood_pressure_diastolic", type: "number", integer: true },
              { label: "Resting HR", field: "resting_heart_rate", type: "number", integer: true },
            ].map(({ label, field, type, integer }) => (
              <div key={field}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input type={type} step={integer ? "1" : "0.1"} value={form[field as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-royal-blue focus:outline-none" />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Notes</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-royal-blue focus:outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" disabled={logMeasurement.isPending} className="rounded bg-royal-blue px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
              {logMeasurement.isPending ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700">Cancel</button>
            {logMeasurement.isError && (
              <p className="text-xs text-red-600">{(logMeasurement.error as Error).message}</p>
            )}
          </div>
        </form>
      )}

      {weights.length >= 2 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="mb-3 text-xs font-medium text-gray-700 uppercase tracking-wide">Weight Trend</p>
          <WeightSparkline data={weights} />
        </div>
      )}

      {!measurements?.length ? (
        <p className="text-sm text-gray-500">No measurements recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Date", "Weight", "BMI", "Waist", "Body Fat", "BP", "HR"].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-medium uppercase text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {measurements.map((m: HealthMeasurement) => (
                <tr key={m.id}>
                  <td className="px-3 py-3 text-sm">{new Date(m.measurement_date).toLocaleDateString("en-IN")}</td>
                  <td className="px-3 py-3 text-sm font-medium">{m.weight_kg ?? "—"}</td>
                  <td className="px-3 py-3 text-sm">{m.bmi ?? "—"}</td>
                  <td className="px-3 py-3 text-sm">{m.waist_cm ?? "—"}</td>
                  <td className="px-3 py-3 text-sm">{m.body_fat_pct ? `${m.body_fat_pct}%` : "—"}</td>
                  <td className="px-3 py-3 text-sm">{m.blood_pressure_systolic ? `${m.blood_pressure_systolic}/${m.blood_pressure_diastolic}` : "—"}</td>
                  <td className="px-3 py-3 text-sm">{m.resting_heart_rate ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function WeightSparkline({ data }: { data: { date: string; val: number }[] }) {
  const W = 300, H = 60, PAD = 8;
  const vals = data.map((d) => d.val);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const step = (W - PAD * 2) / (data.length - 1);
  const points = data.map((d, i) => {
    const x = PAD + i * step;
    const y = PAD + ((max - d.val) / range) * (H - PAD * 2);
    return `${x},${y}`;
  });
  const first = vals[0] ?? 0;
  const last = vals[vals.length - 1] ?? 0;
  const diff = last - first;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-14 w-48 flex-shrink-0">
        <polyline points={points.join(" ")} fill="none"
          stroke={diff <= 0 ? "#16a34a" : "#dc2626"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((_d, i) => {
          const [x, y] = (points[i] ?? "0,0").split(",").map(Number);
          return <circle key={i} cx={x} cy={y} r="3" fill={diff <= 0 ? "#16a34a" : "#dc2626"} />;
        })}
      </svg>
      <div className="text-sm">
        <p className="font-semibold text-gray-900">{last} kg</p>
        <p className={`text-xs font-medium ${diff <= 0 ? "text-green-600" : "text-red-600"}`}>
          {diff > 0 ? "+" : ""}{diff.toFixed(1)} kg since start
        </p>
        <p className="text-xs text-gray-500">{data.length} entries</p>
      </div>
    </div>
  );
}

// ── Care Plans ────────────────────────────────────────────────────────────────

function CarePlansTab({ clientId, tenantId }: { clientId: string; tenantId: string }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const { data: plans, isLoading } = useCarePlans(clientId);
  const createPlan = useCreateCarePlan();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    plan_type: "weight_loss" as CarePlan["plan_type"],
    start_date: new Date().toISOString().slice(0, 10),
    review_date: "",
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createPlan.mutateAsync({
      tenant_id: tenantId, client_id: clientId, created_by: user?.id ?? "",
      title: form.title, plan_type: form.plan_type,
      start_date: form.start_date || undefined, review_date: form.review_date || undefined,
      goals: [], milestones: [],
    });
    setShowForm(false);
    setForm({ title: "", plan_type: "weight_loss", start_date: new Date().toISOString().slice(0, 10), review_date: "" });
  }

  async function approvePlan(planId: string) {
    await supabase.from("care_plans").update({ status: "approved", approved_by: user?.id, approved_at: new Date().toISOString() }).eq("id", planId);
    qc.invalidateQueries({ queryKey: ["care-plans", clientId] });
  }

  async function activatePlan(planId: string) {
    await supabase.from("care_plans").update({ status: "active" }).eq("id", planId);
    qc.invalidateQueries({ queryKey: ["care-plans", clientId] });
  }

  if (isLoading) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium text-gray-700">Care Plans ({plans?.length ?? 0})</p>
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-royal-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-royal-blue-light">
          + Create Plan
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <p className="text-sm font-medium text-gray-900">New Care Plan</p>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Title *</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-royal-blue focus:outline-none" placeholder="e.g. 3-Month Weight Loss Plan" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select value={form.plan_type} onChange={(e) => setForm({ ...form, plan_type: e.target.value as CarePlan["plan_type"] })}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-royal-blue focus:outline-none">
                {["weight_loss", "fitness", "nutrition", "wellness", "custom"].map((t) => (
                  <option key={t} value={t}>{t.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-royal-blue focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Review Date</label>
              <input type="date" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-royal-blue focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createPlan.isPending} className="rounded bg-royal-blue px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
              {createPlan.isPending ? "Saving…" : "Create"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {!plans?.length ? (
          <p className="text-sm text-gray-500">No care plans created yet.</p>
        ) : plans.map((p) => (
          <div key={p.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">{p.title}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                p.status === "active" ? "bg-green-100 text-green-800" :
                p.status === "approved" ? "bg-blue-100 text-blue-800" :
                p.status === "pending_approval" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-700"
              }`}>
                {p.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500 capitalize">{p.plan_type.replace("_", " ")}</p>
            {(p.start_date || p.review_date) && (
              <div className="mt-2 flex gap-4 text-xs text-gray-500">
                {p.start_date && <span>Start: {new Date(p.start_date).toLocaleDateString("en-IN")}</span>}
                {p.review_date && <span>Review: {new Date(p.review_date).toLocaleDateString("en-IN")}</span>}
              </div>
            )}
            <div className="mt-3 flex justify-end gap-2">
              {p.status === "draft" && (
                <button onClick={() => approvePlan(p.id)} className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">Approve</button>
              )}
              {p.status === "approved" && (
                <button onClick={() => activatePlan(p.id)} className="rounded px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50">Activate</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Programs ──────────────────────────────────────────────────────────────────

function ProgramsTab({ clientId }: { clientId: string }) {
  const { data: enrollments, isLoading } = useEnrollments(clientId);
  if (isLoading) return <p className="text-sm text-gray-500">Loading...</p>;

  return (
    <div className="space-y-3">
      {!enrollments?.length ? (
        <p className="text-sm text-gray-500">Not enrolled in any program yet.</p>
      ) : enrollments.map((e) => (
        <div key={e.id} className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">{e.wellness_programs?.name ?? "—"}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
              e.status === "active" ? "bg-green-100 text-green-800" :
              e.status === "completed" ? "bg-blue-100 text-blue-800" :
              e.status === "paused" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-700"
            }`}>{e.status}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
            <span>{new Date(e.start_date).toLocaleDateString("en-IN")} → {new Date(e.end_date).toLocaleDateString("en-IN")}</span>
            {e.sessions_total > 0 && <span>Sessions: {e.sessions_used}/{e.sessions_total}</span>}
            <span className="capitalize">Payment: {e.enrollment_payment_status.replace(/_/g, " ")}</span>
          </div>
          {e.sessions_total > 0 && (
            <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
              <div className="h-1.5 rounded-full bg-royal-blue" style={{ width: `${Math.min(100, (e.sessions_used / e.sessions_total) * 100)}%` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Nutrition ─────────────────────────────────────────────────────────────────

const MEAL_TYPES: MealType[] = [
  "breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack",
];

function NutritionTab({ clientId, tenantId }: { clientId: string; tenantId: string }) {
  const { user } = useAuthStore();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [logForm, setLogForm] = useState({
    meal_type: "breakfast" as MealType,
    custom_description: "", portion_size: "", calories: "", notes: "",
  });
  const [planForm, setPlanForm] = useState({ title: "", start_date: today, end_date: "" });

  const { data: entries, isLoading: loadingEntries } = useNutritionEntries(clientId, date);
  const { data: mealPlans } = useMealPlans(clientId);
  const logEntry = useLogNutritionEntry();
  const createPlan = useCreateMealPlan();

  const totalCals = entries?.reduce((s, e) => s + (e.calories ?? 0), 0) ?? 0;

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    await logEntry.mutateAsync({
      tenant_id: tenantId, client_id: clientId, entry_date: date,
      meal_type: logForm.meal_type,
      custom_description: logForm.custom_description || undefined,
      portion_size: logForm.portion_size || undefined,
      calories: logForm.calories ? Number(logForm.calories) : undefined,
      notes: logForm.notes || undefined,
      logged_by: user?.id ?? "",
    });
    setShowLogForm(false);
    setLogForm({ meal_type: "breakfast", custom_description: "", portion_size: "", calories: "", notes: "" });
  }

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    await createPlan.mutateAsync({
      tenant_id: tenantId, client_id: clientId, created_by: user?.id ?? "",
      title: planForm.title, start_date: planForm.start_date, end_date: planForm.end_date,
    });
    setShowPlanForm(false);
    setPlanForm({ title: "", start_date: today, end_date: "" });
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900">Meal Plans</p>
          <button onClick={() => setShowPlanForm(!showPlanForm)} className="rounded bg-royal-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-royal-blue-light">+ New Plan</button>
        </div>
        {showPlanForm && (
          <form onSubmit={handleCreatePlan} className="mb-3 rounded-lg border border-gray-200 bg-white p-4 space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Plan Title *</label>
              <input required value={planForm.title} onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-royal-blue focus:outline-none" placeholder="e.g. Month 1 Meal Plan" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                <input type="date" value={planForm.start_date} onChange={(e) => setPlanForm({ ...planForm, start_date: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-royal-blue focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                <input type="date" value={planForm.end_date} onChange={(e) => setPlanForm({ ...planForm, end_date: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-royal-blue focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={createPlan.isPending} className="rounded bg-royal-blue px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">{createPlan.isPending ? "Saving…" : "Create"}</button>
              <button type="button" onClick={() => setShowPlanForm(false)} className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700">Cancel</button>
            </div>
          </form>
        )}
        {!mealPlans?.length ? (
          <p className="text-sm text-gray-500">No meal plans yet.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {mealPlans.map((mp) => (
              <div key={mp.id} className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm">
                <p className="font-medium text-gray-900">{mp.title}</p>
                <p className="text-xs text-gray-500 capitalize mt-0.5">{mp.status} · {new Date(mp.start_date).toLocaleDateString("en-IN")} – {new Date(mp.end_date).toLocaleDateString("en-IN")}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-3 mb-3">
          <p className="text-sm font-semibold text-gray-900">Daily Diary</p>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-royal-blue focus:outline-none" />
          {totalCals > 0 && <span className="text-xs text-gray-500">{totalCals} kcal total</span>}
          <button onClick={() => setShowLogForm(!showLogForm)} className="ml-auto rounded bg-royal-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-royal-blue-light">+ Log Food</button>
        </div>

        {showLogForm && (
          <form onSubmit={handleLog} className="mb-3 rounded-lg border border-gray-200 bg-white p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Meal</label>
                <select value={logForm.meal_type} onChange={(e) => setLogForm({ ...logForm, meal_type: e.target.value as MealType })}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-royal-blue focus:outline-none">
                  {MEAL_TYPES.map((m) => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Food / Description *</label>
                <input required value={logForm.custom_description} onChange={(e) => setLogForm({ ...logForm, custom_description: e.target.value })}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-royal-blue focus:outline-none" placeholder="e.g. Oats with banana" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Calories</label>
                <input type="number" value={logForm.calories} onChange={(e) => setLogForm({ ...logForm, calories: e.target.value })}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-royal-blue focus:outline-none" placeholder="kcal" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={logEntry.isPending} className="rounded bg-royal-blue px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">{logEntry.isPending ? "Saving…" : "Log"}</button>
              <button type="button" onClick={() => setShowLogForm(false)} className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700">Cancel</button>
            </div>
          </form>
        )}

        {loadingEntries ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : !entries?.length ? (
          <p className="text-sm text-gray-500">Nothing logged for this date.</p>
        ) : (
          <div className="space-y-2">
            {MEAL_TYPES.filter((m) => entries.some((e) => e.meal_type === m)).map((mealType) => {
              const group = entries.filter((e) => e.meal_type === mealType);
              const mealCals = group.reduce((s, e) => s + (e.calories ?? 0), 0);
              return (
                <div key={mealType} className="rounded-lg border border-gray-200 bg-white">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-700 capitalize">{mealType.replace(/_/g, " ")}</p>
                    {mealCals > 0 && <p className="text-xs text-gray-500">{mealCals} kcal</p>}
                  </div>
                  {group.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between px-4 py-2 text-sm">
                      <span className="text-gray-900">{entry.custom_description ?? entry.food_items?.name ?? "—"}</span>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {entry.portion_size && <span>{entry.portion_size}</span>}
                        {entry.calories && <span>{entry.calories} kcal</span>}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
