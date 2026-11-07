import { useState, useMemo, type FormEvent } from "react";
import { X, AlertTriangle } from "lucide-react";
import { useCreateGrant, useDelegations } from "@/hooks/use-delegations";
import { useTenants } from "@/hooks/use-tenants";
import { useActiveSupportMembers } from "@/hooks/use-support-team";
import { PERMISSIONS, PERMISSION_KEYS, getActionsForPermission } from "@/lib/permission-config";

interface Props {
  onClose: () => void;
}

export function CreateGrantDialog({ onClose }: Props) {
  const { data: tenants } = useTenants();
  const { data: supportMembers, isLoading: membersLoading } = useActiveSupportMembers();
  const { data: existingGrants } = useDelegations();
  const createGrant = useCreateGrant();

  const [selectedUserId, setSelectedUserId] = useState("");
  const [permissionKey, setPermissionKey] = useState("module.entitlement.change");
  const [tenantScope, setTenantScope] = useState("");
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [reason, setReason] = useState("");

  const selectedMember = supportMembers?.find((m) => m.user_id === selectedUserId);
  const availableActions = getActionsForPermission(permissionKey);

  const duplicateGrant = useMemo(() => {
    if (!selectedUserId || !permissionKey) return null;
    return (existingGrants ?? []).find(
      (g) =>
        g.status === "active" &&
        g.grantee_user_id === selectedUserId &&
        g.permission_key === permissionKey
    ) ?? null;
  }, [existingGrants, selectedUserId, permissionKey]);

  function handlePermissionChange(key: string) {
    setPermissionKey(key);
    setSelectedActions(new Set());
  }

  function toggleAction(action: string) {
    setSelectedActions((prev) => {
      const next = new Set(prev);
      if (next.has(action)) next.delete(action);
      else next.add(action);
      return next;
    });
  }

  function selectAllActions() {
    setSelectedActions(new Set(availableActions.map((a) => a.value)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedMember || selectedActions.size === 0) return;

    const now = new Date();
    const expires = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

    await createGrant.mutateAsync({
      grantee_email: selectedMember!.platform_users.email,
      permission_key: permissionKey,
      tenant_scope_id: tenantScope || undefined,
      allowed_actions: Array.from(selectedActions),
      requires_approval: requiresApproval,
      effective_at: now.toISOString(),
      expires_at: expires.toISOString(),
      reason: reason.trim(),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Create Delegation Grant
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Support Team Member */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Support Team Member
            </label>
            {membersLoading ? (
              <p className="mt-1 text-sm text-gray-400">Loading team...</p>
            ) : !supportMembers?.length ? (
              <p className="mt-1 text-sm text-amber-600">
                No active support team members. Add members from the Support Team page first.
              </p>
            ) : (
              <select
                required
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
              >
                <option value="">Select a team member...</option>
                {supportMembers.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.platform_users.full_name} ({m.platform_users.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Permission Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Permission
            </label>
            <select
              value={permissionKey}
              onChange={(e) => handlePermissionChange(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
            >
              {PERMISSION_KEYS.map((key) => (
                <option key={key} value={key}>
                  {PERMISSIONS[key]?.label ?? key}
                </option>
              ))}
            </select>
          </div>

          {/* Allowed Actions — checkboxes */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Allowed Actions
              </label>
              <button
                type="button"
                onClick={selectAllActions}
                className="text-xs text-royal-blue hover:underline"
              >
                Select all
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {availableActions.map((a) => (
                <label key={a.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedActions.has(a.value)}
                    onChange={() => toggleAction(a.value)}
                    className="h-4 w-4 rounded border-gray-300 text-royal-blue focus:ring-royal-blue"
                  />
                  <span className="text-sm text-gray-700">{a.label}</span>
                  <span className="text-xs text-gray-400 font-mono">({a.value})</span>
                </label>
              ))}
            </div>
            {selectedActions.size === 0 && (
              <p className="mt-1 text-xs text-amber-600">Select at least one action</p>
            )}
          </div>

          {/* Tenant Scope */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tenant Scope
            </label>
            <select
              value={tenantScope}
              onChange={(e) => setTenantScope(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
            >
              <option value="">All tenants</option>
              {tenants?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Expires + Approval */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Expires in (hours)
              </label>
              <input
                type="number"
                required
                min={1}
                max={720}
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={requiresApproval}
                  onChange={(e) => setRequiresApproval(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-royal-blue focus:ring-royal-blue"
                />
                <span className="text-sm text-gray-700">
                  Requires approval
                </span>
              </label>
            </div>
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
              placeholder="Support ticket #1234 — account recovery assistance"
            />
          </div>

          {duplicateGrant && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800">
                This member already has an active <strong>{PERMISSIONS[permissionKey]?.label ?? permissionKey}</strong> grant
                (expires {new Date(duplicateGrant.expires_at).toLocaleDateString()}).
                Revoke the existing grant first, or choose a different permission.
              </p>
            </div>
          )}

          {createGrant.error && (
            <p className="text-sm text-red-600">
              {(createGrant.error as Error).message}
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
              disabled={createGrant.isPending || !selectedUserId || selectedActions.size === 0 || !!duplicateGrant}
              className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-royal-blue-light disabled:opacity-50"
              title={duplicateGrant ? "Duplicate active grant — revoke existing first" : undefined}
            >
              {createGrant.isPending ? "Creating..." : "Create Grant"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
