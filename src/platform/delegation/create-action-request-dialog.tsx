import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { useSubmitAction } from "@/hooks/use-action-requests";
import { useDelegations } from "@/hooks/use-delegations";
import { useTenants } from "@/hooks/use-tenants";
import { useAuthStore } from "@/hooks/use-auth";
import { PERMISSIONS } from "@/lib/permission-config";

interface Props {
  onClose: () => void;
}

export function CreateActionRequestDialog({ onClose }: Props) {
  const { user } = useAuthStore();
  const { data: grants } = useDelegations();
  const { data: tenants } = useTenants();
  const submitAction = useSubmitAction();

  const [grantId, setGrantId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [action, setAction] = useState("");
  const [reason, setReason] = useState("");

  // Only show this user's active grants
  const myActiveGrants = (grants ?? []).filter(
    (g) => g.status === "active" && g.grantee_user_id === user?.id
  );

  const selectedGrant = myActiveGrants.find((g) => g.id === grantId);

  const actionOptions = selectedGrant
    ? selectedGrant.allowed_actions.map((a) => {
        const permDef = PERMISSIONS[selectedGrant.permission_key];
        const actionDef = permDef?.actions.find((ad) => ad.value === a);
        return { value: a, label: actionDef?.label ?? a };
      })
    : [];

  function handleGrantChange(id: string) {
    setGrantId(id);
    setAction("");
    const grant = myActiveGrants.find((g) => g.id === id);
    if (grant?.tenant_scope_id) {
      setTenantId(grant.tenant_scope_id);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedGrant || !action || !tenantId) return;

    await submitAction.mutateAsync({
      permission_key: selectedGrant.permission_key,
      tenant_id: tenantId,
      action,
      reason: reason.trim(),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Submit Action Request
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {myActiveGrants.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-6 text-center">
            <p className="text-sm text-gray-500">
              You have no active delegation grants.
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Ask your Super Admin to create a grant for you first.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Grant */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Your Delegation Grant
              </label>
              <select
                required
                value={grantId}
                onChange={(e) => handleGrantChange(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
              >
                <option value="">Select a grant...</option>
                {myActiveGrants.map((g) => {
                  const permLabel =
                    PERMISSIONS[g.permission_key]?.label ?? g.permission_key;
                  return (
                    <option key={g.id} value={g.id}>
                      {permLabel}
                      {g.tenant?.name ? ` — ${g.tenant.name}` : " — All tenants"}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Target Tenant */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Target Tenant
              </label>
              {selectedGrant?.tenant_scope_id ? (
                <p className="mt-1 text-sm text-gray-600">
                  {selectedGrant.tenant?.name ?? "Scoped tenant"}{" "}
                  <span className="text-xs text-gray-400">(set by grant)</span>
                </p>
              ) : (
                <select
                  required
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
                >
                  <option value="">Select a tenant...</option>
                  {tenants?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Requested Action */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Requested Action
              </label>
              {!grantId ? (
                <p className="mt-1 text-xs text-gray-400">
                  Select a grant first
                </p>
              ) : actionOptions.length === 0 ? (
                <p className="mt-1 text-xs text-amber-600">
                  No actions configured on this grant
                </p>
              ) : (
                <select
                  required
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
                >
                  <option value="">Select an action...</option>
                  {actionOptions.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Reason
              </label>
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
                placeholder="Ticket #1234 — user locked out"
              />
            </div>

            {submitAction.error && (
              <p className="text-sm text-red-600">
                {submitAction.error instanceof Error
                  ? submitAction.error.message
                  : "Request failed"}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitAction.isPending || !action || !tenantId}
                className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-royal-blue-light disabled:opacity-50"
              >
                {submitAction.isPending ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
