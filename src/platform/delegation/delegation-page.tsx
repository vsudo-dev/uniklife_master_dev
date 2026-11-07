import { useState } from "react";
import { Plus, Shield } from "lucide-react";
import { useDelegations, useRevokeGrant, type GrantWithUsers } from "@/hooks/use-delegations";
import { CreateGrantDialog } from "./create-grant-dialog";
import { ActionRequestsSection } from "./action-requests-section";
import { PERMISSIONS } from "@/lib/permission-config";
import { cn } from "@/lib/cn";
import type { GrantStatus } from "@/types";

const STATUS_STYLES: Record<GrantStatus, string> = {
  active: "bg-green-50 text-green-700",
  expired: "bg-yellow-50 text-yellow-700",
  revoked: "bg-red-50 text-red-700",
};

function permLabel(key: string): string {
  return PERMISSIONS[key]?.label ?? key;
}

interface GranteeGroup {
  name: string;
  email: string;
  grants: GrantWithUsers[];
}

function groupByGrantee(grants: GrantWithUsers[]): GranteeGroup[] {
  const map = new Map<string, GranteeGroup>();
  for (const g of grants) {
    const key = g.grantee.email;
    if (!map.has(key)) {
      map.set(key, { name: g.grantee.full_name, email: key, grants: [] });
    }
    map.get(key)!.grants.push(g);
  }
  return Array.from(map.values());
}

export function DelegationPage() {
  const { data: grants, isLoading, error } = useDelegations();
  const revokeGrant = useRevokeGrant();
  const [showCreate, setShowCreate] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; name: string } | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  function handleRevoke(grantId: string, granteeName: string) {
    setRevokeTarget({ id: grantId, name: granteeName });
    setRevokeReason("");
  }

  function confirmRevoke() {
    if (!revokeTarget || !revokeReason.trim()) return;
    revokeGrant.mutate(
      { grantId: revokeTarget.id, reason: revokeReason.trim() },
      { onSuccess: () => setRevokeTarget(null) }
    );
  }

  const allGroups = groupByGrantee(grants ?? []);
  const groups = allGroups
    .map((g) => ({
      ...g,
      grants: showHistory ? g.grants : g.grants.filter((gr) => gr.status === "active"),
    }))
    .filter((g) => g.grants.length > 0);

  const hiddenCount = (grants ?? []).filter((g) => g.status !== "active").length;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Support Delegation
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage time-limited permission grants for support operations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowHistory((prev) => !prev)}
              className="text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              {showHistory ? "Hide history" : `Show history (${hiddenCount})`}
            </button>
          )}
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-royal-blue-light"
          >
            <Plus className="h-4 w-4" />
            Create Grant
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="mt-8 text-center text-sm text-gray-500">
          Loading delegations...
        </div>
      )}

      {error && (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load delegations: {(error as Error).message}
        </div>
      )}

      {!isLoading && groups.length === 0 && (
        <div className="mt-12 text-center">
          <Shield className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-900">
            No delegation grants
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Create a time-limited grant for support personnel.
          </p>
        </div>
      )}

      {/* Grouped by grantee */}
      {groups.length > 0 && (
        <div className="mt-6 space-y-4">
          {groups.map((group) => (
            <div key={group.email} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              {/* Grantee header */}
              <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-5 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  {group.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{group.name}</p>
                  <p className="text-xs text-gray-500">{group.email}</p>
                </div>
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  {group.grants.filter((g) => g.status === "active").length} active
                </span>
              </div>

              {/* Grants */}
              <div className="divide-y divide-gray-100">
                {group.grants.map((grant) => (
                  <div key={grant.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">
                          {permLabel(grant.permission_key)}
                        </span>
                        <span className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          STATUS_STYLES[grant.status]
                        )}>
                          {grant.status}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {grant.allowed_actions.map((a) => (
                          <span key={a} className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                            {a}
                          </span>
                        ))}
                        <span className="text-xs text-gray-400 ml-1">
                          · {grant.tenant?.name ?? "All tenants"}
                          · expires {new Date(grant.expires_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {grant.status === "active" && (
                      <button
                        onClick={() => handleRevoke(grant.id, grant.grantee.full_name)}
                        className="shrink-0 text-xs font-medium text-red-600 hover:text-red-800"
                        disabled={revokeGrant.isPending}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateGrantDialog onClose={() => setShowCreate(false)} />
      )}

      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Revoke Grant</h3>
            <p className="mt-1 text-sm text-gray-500">
              Revoking grant for <span className="font-medium">{revokeTarget.name}</span>. This cannot be undone.
            </p>
            <textarea
              className="mt-4 w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900 placeholder-gray-400 focus:border-royal-blue focus:outline-none focus:ring-1 focus:ring-royal-blue"
              rows={3}
              placeholder="Reason for revocation (required)"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setRevokeTarget(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmRevoke}
                disabled={!revokeReason.trim() || revokeGrant.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {revokeGrant.isPending ? "Revoking…" : "Revoke Grant"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ActionRequestsSection />
    </div>
  );
}
