import { useAuthStore } from "@/hooks/use-auth";
import { useDelegations } from "@/hooks/use-delegations";
import { usePageView } from "@/hooks/use-activity-log";
import { Shield, Clock, CheckCircle, AlertCircle, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  expired: "bg-gray-100 text-gray-600",
  revoked: "bg-red-100 text-red-700",
};

function formatExpiry(dt: string) {
  const d = new Date(dt);
  const now = new Date();
  const diffH = Math.round((d.getTime() - now.getTime()) / 3600000);
  if (diffH < 0) return "Expired";
  if (diffH < 24) return `Expires in ${diffH}h`;
  return `Expires ${d.toLocaleDateString()}`;
}

export function SupportHome() {
  usePageView("support-home");
  const { user } = useAuthStore();
  const { data: allGrants, isLoading } = useDelegations();

  // Show only grants FOR this user (where they are the grantee)
  const myGrants = (allGrants ?? []).filter(
    (g) => g.grantee_user_id === user?.id
  );
  const activeGrants = myGrants.filter((g) => g.status === "active");
  const expiredGrants = myGrants.filter((g) => g.status === "expired" || g.status === "revoked");

  // Unique tenants across active grants
  const activeTenants = Array.from(
    new Map(
      activeGrants
        .filter((g) => g.tenant?.name)
        .map((g) => [g.tenant_scope_id, g.tenant])
    ).values()
  );

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Support Overview</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Delegated access granted to you as support staff
        </p>
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: "Active Grants", value: activeGrants.length, icon: CheckCircle, color: "text-green-600" },
          { label: "Expired / Revoked", value: expiredGrants.length, icon: Clock, color: "text-yellow-600" },
          { label: "Tenants in Scope", value: activeTenants.length, icon: Building2, color: "text-blue-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">{label}</p>
              <Icon className={cn("h-4 w-4", color)} />
            </div>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Tenants I can access */}
      {activeTenants.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Tenants You Can Access</h2>
          <div className="grid grid-cols-2 gap-3">
            {activeTenants.map((tenant) => {
              const grant = activeGrants.find((g) => g.tenant_scope_id === null || g.tenant?.name === tenant?.name);
              return (
                <div
                  key={tenant?.name}
                  className="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
                      <Building2 className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tenant?.name}</p>
                      <p className="text-xs text-gray-500">
                        {grant ? formatExpiry(grant.expires_at) : ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-green-600 font-medium">Active</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* My active grants */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">My Delegation Grants</h2>
          <Link to="/support/delegations" className="text-xs text-blue-600 hover:underline">
            View all →
          </Link>
        </div>

        {isLoading && (
          <p className="text-sm text-gray-400">Loading grants…</p>
        )}

        {!isLoading && myGrants.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
            <Shield className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No delegation grants assigned to you yet.</p>
            <p className="mt-1 text-xs text-gray-400">Ask a super admin to grant you access.</p>
          </div>
        )}

        {!isLoading && myGrants.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Permission</th>
                  <th className="px-4 py-3 text-left">Tenant Scope</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Expiry</th>
                  <th className="px-4 py-3 text-left">Needs Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {myGrants.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{g.permission_key}</td>
                    <td className="px-4 py-3 text-gray-500">{g.tenant?.name ?? "All tenants"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[g.status] ?? "bg-gray-100 text-gray-600")}>
                        {g.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatExpiry(g.expires_at)}</td>
                    <td className="px-4 py-3">
                      {g.requires_approval ? (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <AlertCircle className="h-3.5 w-3.5" /> Yes
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-3.5 w-3.5" /> No
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
