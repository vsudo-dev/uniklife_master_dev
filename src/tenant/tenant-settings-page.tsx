import { useState } from "react";
import { useTenantContext } from "@/contexts/tenant-context";
import { BrandingSection } from "@/platform/tenants/branding-section";
import { useTenant, useUpdateTenant } from "@/hooks/use-tenants";

export function TenantSettingsPage() {
  const { tenantId } = useTenantContext();

  return (
    <div className="p-6 space-y-8">
      <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
      <BrandingSection tenantId={tenantId} tenantName="" />
      <CrmSettingsSection tenantId={tenantId} />
    </div>
  );
}

function CrmSettingsSection({ tenantId }: { tenantId: string }) {
  const { data: tenant, isLoading } = useTenant(tenantId);
  const update = useUpdateTenant(tenantId);
  const [saved, setSaved] = useState(false);

  if (isLoading) return null;

  const strictMode = tenant?.crm_tag_strict_mode ?? false;
  const tag = tenant?.crm_contact_tag ?? "—";

  const toggle = () => {
    update.mutate(
      { crm_tag_strict_mode: !strictMode },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      }
    );
  };

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900">CRM Sync Settings</h3>
      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-5 space-y-4">

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Contact Tag Filter</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Only contacts tagged <span className="font-mono font-medium text-gray-800">{tag}</span> in MyAppz sync to this tenant.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Tag Filter Mode</p>
            <p className="text-xs text-gray-500 mt-0.5 max-w-sm">
              {strictMode
                ? "Strict — contacts with no tags in webhook payload are skipped. Enable only after CRM fixes their webhook."
                : "Safe (recommended) — contacts with no tags in payload are synced. Use this while CRM webhook bug is unresolved."}
            </p>
          </div>
          <button
            onClick={toggle}
            disabled={update.isPending}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
              strictMode ? "bg-royal-blue" : "bg-gray-200"
            }`}
            role="switch"
            aria-checked={strictMode}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                strictMode ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            strictMode ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
          }`}>
            {strictMode ? "Strict mode ON" : "Safe mode (default)"}
          </span>
          {saved && <span className="text-xs text-green-600">Saved</span>}
          {update.isError && <span className="text-xs text-red-600">{(update.error as Error).message}</span>}
        </div>

      </div>
    </div>
  );
}
