import { useState } from "react";
import { ExternalLink, Copy, Check, Users, UserCircle, Building2, Shield, AlertCircle } from "lucide-react";
import { useTenants } from "@/hooks/use-tenants";
import { cn } from "@/lib/cn";
import type { Tenant } from "@/types";

const BASE = window.location.origin;

// ── Copy button ────────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy URL"
      className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ── URL row ────────────────────────────────────────────────────────────────────

function UrlRow({ label, sublabel, url, accent }: { label: string; sublabel: string; url: string; accent: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-semibold uppercase tracking-wide", accent)}>{label}</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-400">{sublabel}</span>
        </div>
        <p className="mt-0.5 truncate font-mono text-xs text-gray-600">{url}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <CopyButton value={url} />
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          title="Open in new tab"
          className="flex h-7 items-center gap-1 rounded-md border border-gray-200 px-2 text-xs font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
        >
          Open <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

// ── Platform section ───────────────────────────────────────────────────────────

function PlatformSection() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-gray-100 bg-gray-50 px-5 py-3">
        <Shield className="h-4 w-4 text-indigo-500" />
        <span className="text-sm font-semibold text-gray-900">Platform</span>
        <span className="ml-auto rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">Internal only</span>
      </div>
      <div className="divide-y divide-gray-100 px-5">
        <UrlRow
          label="Super Admin"
          sublabel="Full platform access"
          url={`${BASE}/`}
          accent="text-indigo-600"
        />
        <UrlRow
          label="Support Ops"
          sublabel="Delegation & action requests"
          url={`${BASE}/auth/login`}
          accent="text-purple-600"
        />
        <div className="flex items-center gap-2 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Platform Admin</span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-400">Multi-tenant manager</span>
            </div>
            <p className="mt-0.5 text-xs text-gray-400 italic">— coming in a future phase —</p>
          </div>
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">Planned</span>
        </div>
      </div>
    </div>
  );
}

// ── Tenant card ────────────────────────────────────────────────────────────────

function TenantCard({ tenant }: { tenant: Tenant }) {
  if (!tenant.slug) return null;

  const teamUrl   = `${BASE}/login/${tenant.slug}`;
  const clientUrl = `${BASE}/join/${tenant.slug}`;
  const isActive  = tenant.status === "active";

  return (
    <div className={cn("rounded-xl border bg-white overflow-hidden", isActive ? "border-gray-200" : "border-gray-100 opacity-60")}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-5 py-3">
        <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
        <span className="text-sm font-semibold text-gray-900 truncate">{tenant.name}</span>
        <span className="ml-auto font-mono text-xs text-gray-400 shrink-0">{tenant.slug}</span>
        <span className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
          isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
        )}>
          {tenant.status}
        </span>
      </div>

      <div className="divide-y divide-gray-100 px-5">
        {/* Team login — shared by Admin, Practitioner, Staff */}
        <div>
          <UrlRow
            label="Team Login"
            sublabel="Admin · Practitioner · Staff — role auto-detected after sign in"
            url={teamUrl}
            accent="text-blue-600"
          />
          <div className="mb-2 flex flex-wrap gap-1.5">
            {[
              { role: "Admin",        color: "bg-indigo-50 text-indigo-700" },
              { role: "Practitioner", color: "bg-teal-50 text-teal-700" },
              { role: "Staff",        color: "bg-purple-50 text-purple-700" },
            ].map(({ role, color }) => (
              <span key={role} className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", color)}>
                {role}
              </span>
            ))}
            <span className="text-[10px] text-gray-400 self-center">→ each lands on their own home page</span>
          </div>
        </div>

        {/* Client portal */}
        <UrlRow
          label="Client Portal"
          sublabel="Patient / Member — signup + login"
          url={clientUrl}
          accent="text-pink-600"
        />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function PortalLinksPage() {
  const { data: tenants, isLoading, error } = useTenants();

  const active   = (tenants ?? []).filter((t) => t.status === "active");
  const inactive = (tenants ?? []).filter((t) => t.status !== "active");
  const sorted   = [...active, ...inactive];

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Portal Links</h2>
        <p className="mt-1 text-sm text-gray-500">
          Every entry point in the system — share the right URL with each role.
          All URLs auto-detect role after login and redirect accordingly.
        </p>
      </div>

      <div className="space-y-4">
        {/* Platform */}
        <PlatformSection />

        {/* Divider */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 border-t border-gray-200" />
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
            <Users className="h-3.5 w-3.5" />
            Tenant Portals
            {!isLoading && (
              <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                {active.length} active
              </span>
            )}
          </div>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {isLoading && (
          <div className="text-sm text-gray-500">Loading tenants…</div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Failed to load tenants: {(error as Error).message}
          </div>
        )}

        {!isLoading && sorted.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
            <UserCircle className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">No tenants yet. Create one from the Tenants page.</p>
          </div>
        )}

        {sorted.map((tenant) => (
          <TenantCard key={tenant.id} tenant={tenant} />
        ))}
      </div>
    </div>
  );
}
