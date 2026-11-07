import { useState } from "react";
import { useBranding, useUpsertBranding } from "@/hooks/use-branding";
import type { TenantBranding } from "@/types";

function buildFormDefaults(branding: TenantBranding | null | undefined, tenantName: string) {
  if (branding) {
    return {
      business_name: branding.business_name,
      primary_color: branding.primary_color,
      secondary_color: branding.secondary_color,
      accent_color: branding.accent_color,
      sidebar_gradient_from: branding.sidebar_gradient_from ?? "",
      sidebar_gradient_to: branding.sidebar_gradient_to ?? "",
      font_family: branding.font_family,
      custom_domain: branding.custom_domain ?? "",
      subdomain: branding.subdomain ?? "",
      logo_url: branding.logo_url ?? "",
      favicon_url: branding.favicon_url ?? "",
      support_email: branding.support_email ?? "",
      privacy_notice_url: branding.privacy_notice_url ?? "",
      email_sender_name: branding.email_sender_name ?? "",
      email_sender_address: branding.email_sender_address ?? "",
    };
  }
  return {
    business_name: tenantName,
    primary_color: "#1a237e",
    secondary_color: "#c9a84c",
    accent_color: "#f5f5f5",
    sidebar_gradient_from: "",
    sidebar_gradient_to: "",
    font_family: "Urbanist",
    custom_domain: "",
    subdomain: "",
    logo_url: "",
    favicon_url: "",
    support_email: "",
    privacy_notice_url: "",
    email_sender_name: "",
    email_sender_address: "",
  };
}

export function BrandingSection({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const { data: branding, isLoading } = useBranding(tenantId);
  const upsert = useUpsertBranding();
  const [editing, setEditing] = useState(false);

  if (isLoading) return <p className="mt-8 text-sm text-gray-500">Loading branding...</p>;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">White-Label Branding</h3>
        <button
          onClick={() => setEditing(!editing)}
          className="text-xs font-medium text-royal-blue hover:text-royal-blue-light"
        >
          {editing ? "Cancel" : branding ? "Edit" : "Configure"}
        </button>
      </div>

      {!editing && branding && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Business Name</p>
              <p className="mt-1 text-sm text-gray-900">{branding.business_name}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Font</p>
              <p className="mt-1 text-sm text-gray-900">{branding.font_family}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Domain</p>
              <p className="mt-1 text-sm text-gray-900">{branding.custom_domain || branding.subdomain || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Colors</p>
              <div className="mt-1 flex gap-1">
                <span className="inline-block h-6 w-6 rounded border" style={{ backgroundColor: branding.primary_color }} title="Primary" />
                <span className="inline-block h-6 w-6 rounded border" style={{ backgroundColor: branding.secondary_color }} title="Secondary" />
                <span className="inline-block h-6 w-6 rounded border" style={{ backgroundColor: branding.accent_color }} title="Accent" />
              </div>
            </div>
          </div>
          {branding.logo_url && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase text-gray-500">Logo</p>
              <img src={branding.logo_url} alt="Logo" className="mt-1 h-10 object-contain" />
            </div>
          )}
        </div>
      )}

      {!editing && !branding && (
        <p className="mt-4 text-sm text-gray-500">No branding configured yet.</p>
      )}

      {editing && (
        <BrandingForm
          key={branding?.id ?? "new"}
          tenantId={tenantId}
          defaults={buildFormDefaults(branding, tenantName)}
          lightTheme={branding?.light_theme ?? {}}
          darkTheme={branding?.dark_theme ?? {}}
          upsert={upsert}
          onDone={() => setEditing(false)}
        />
      )}
    </div>
  );
}

function BrandingForm({
  tenantId,
  defaults,
  lightTheme,
  darkTheme,
  upsert,
  onDone,
}: {
  tenantId: string;
  defaults: ReturnType<typeof buildFormDefaults>;
  lightTheme: Record<string, unknown>;
  darkTheme: Record<string, unknown>;
  upsert: ReturnType<typeof useUpsertBranding>;
  onDone: () => void;
}) {
  const [form, setForm] = useState(defaults);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    upsert.mutate(
      {
        tenant_id: tenantId,
        business_name: form.business_name,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        accent_color: form.accent_color,
        sidebar_gradient_from: form.sidebar_gradient_from || null,
        sidebar_gradient_to: form.sidebar_gradient_to || null,
        font_family: form.font_family,
        custom_domain: form.custom_domain || null,
        subdomain: form.subdomain || null,
        logo_url: form.logo_url || null,
        favicon_url: form.favicon_url || null,
        support_email: form.support_email || null,
        privacy_notice_url: form.privacy_notice_url || null,
        email_sender_name: form.email_sender_name || null,
        email_sender_address: form.email_sender_address || null,
        light_theme: lightTheme,
        dark_theme: darkTheme,
      },
      { onSuccess: onDone }
    );
  };

  return (
    <form onSubmit={handleSave} className="mt-4 rounded-lg border border-gray-200 bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business Name" value={form.business_name} onChange={(v) => setForm({ ...form, business_name: v })} required />
        <Field label="Font Family" value={form.font_family} onChange={(v) => setForm({ ...form, font_family: v })} />
        <Field label="Logo URL" value={form.logo_url} onChange={(v) => setForm({ ...form, logo_url: v })} />
        <Field label="Favicon URL" value={form.favicon_url} onChange={(v) => setForm({ ...form, favicon_url: v })} />
        <ColorField label="Primary Color" value={form.primary_color} onChange={(v) => setForm({ ...form, primary_color: v })} />
        <ColorField label="Secondary Color" value={form.secondary_color} onChange={(v) => setForm({ ...form, secondary_color: v })} />
        <ColorField label="Accent Color" value={form.accent_color} onChange={(v) => setForm({ ...form, accent_color: v })} />
        <Field label="Sidebar Gradient From" value={form.sidebar_gradient_from} onChange={(v) => setForm({ ...form, sidebar_gradient_from: v })} placeholder="#1a237e" />
        <Field label="Sidebar Gradient To" value={form.sidebar_gradient_to} onChange={(v) => setForm({ ...form, sidebar_gradient_to: v })} placeholder="#0d1642" />
        <Field label="Custom Domain" value={form.custom_domain} onChange={(v) => setForm({ ...form, custom_domain: v })} placeholder="app.example.com" />
        <Field label="Subdomain" value={form.subdomain} onChange={(v) => setForm({ ...form, subdomain: v })} placeholder="clinic-name" />
        <Field label="Support Email" value={form.support_email} onChange={(v) => setForm({ ...form, support_email: v })} />
        <Field label="Email Sender Name" value={form.email_sender_name} onChange={(v) => setForm({ ...form, email_sender_name: v })} />
        <Field label="Email Sender Address" value={form.email_sender_address} onChange={(v) => setForm({ ...form, email_sender_address: v })} />
        <Field label="Privacy Notice URL" value={form.privacy_notice_url} onChange={(v) => setForm({ ...form, privacy_notice_url: v })} />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
          Cancel
        </button>
        <button
          type="submit"
          disabled={upsert.isPending}
          className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-light disabled:opacity-50"
        >
          {upsert.isPending ? "Saving..." : "Save Branding"}
        </button>
      </div>
      {upsert.isError && (
        <p className="mt-2 text-sm text-red-600">{(upsert.error as Error).message}</p>
      )}
    </form>
  );
}

function Field({ label, value, onChange, required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
      />
    </div>
  );
}

function ColorField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded border border-gray-300"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 font-mono text-sm"
        />
      </div>
    </div>
  );
}
