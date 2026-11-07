import { useAuthStore } from "@/hooks/use-auth";
import { useDelegations } from "@/hooks/use-delegations";
import { usePageView } from "@/hooks/use-activity-log";
import { PERMISSIONS } from "@/lib/permission-config";
import { Shield, CheckCircle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  expired: "bg-gray-100 text-gray-600",
  revoked: "bg-red-100 text-red-700",
};

const STATUS_ICON: Record<string, typeof CheckCircle> = {
  active: CheckCircle,
  pending: Clock,
  expired: Clock,
  revoked: XCircle,
};

export function SupportDelegationsPage() {
  usePageView("support-delegations");
  const { user } = useAuthStore();
  const { data: allGrants, isLoading } = useDelegations();

  // support_ops sees only their own grants; super_admin sees all
  const grants = (allGrants ?? []).filter(
    (g) => user?.platform_role === "super_admin" || g.grantee_user_id === user?.id
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Delegation Grants</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Grants that give support staff elevated access to tenant operations
        </p>
      </div>

      {isLoading && <p className="text-sm text-gray-400">Loading grants…</p>}

      {!isLoading && grants.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
          <Shield className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No delegation grants found.</p>
        </div>
      )}

      {!isLoading && grants.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Grantee</th>
                <th className="px-4 py-3 text-left">Permission</th>
                <th className="px-4 py-3 text-left">Tenant Scope</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Expires</th>
                <th className="px-4 py-3 text-left">Approval Required</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {grants.map((g) => {
                const StatusIcon = STATUS_ICON[g.status] ?? Shield;
                return (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{g.grantee?.full_name}</p>
                      <p className="text-xs text-gray-500">{g.grantee?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900">{PERMISSIONS[g.permission_key]?.label ?? g.permission_key}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {g.allowed_actions.map((a) => (
                          <span key={a} className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">{a}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {g.tenant?.name ?? "All tenants"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[g.status] ?? "bg-gray-100 text-gray-600")}>
                        <StatusIcon className="h-3 w-3" />
                        {g.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(g.expires_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {g.requires_approval ? (
                        <span className="text-yellow-700">Yes</span>
                      ) : (
                        <span className="text-green-700">No</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
