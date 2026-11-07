import { useQuery } from "@tanstack/react-query";
import { GitBranch } from "lucide-react";
import { useBranches } from "@/hooks/use-branches";
import { supabase } from "@/lib/supabase";

interface BranchStats {
  branch_id: string;
  staff: number;
}

function useBranchStats(tenantId: string) {
  return useQuery({
    queryKey: ["branch-stats", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<BranchStats[]> => {
      const { data } = await supabase
        .from("staff_profiles")
        .select("branch_id")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .not("branch_id", "is", null);

      const staffMap = new Map<string, number>();
      for (const row of data ?? []) {
        if (row.branch_id) staffMap.set(row.branch_id, (staffMap.get(row.branch_id) ?? 0) + 1);
      }

      return Array.from(staffMap.entries()).map(([branch_id, staff]) => ({ branch_id, staff }));
    },
  });
}

export function BranchesOverviewPage({ tenantId }: { tenantId: string }) {
  const { data: branches, isLoading } = useBranches(tenantId);
  const { data: stats } = useBranchStats(tenantId);

  function getStats(branchId: string) {
    return stats?.find((s) => s.branch_id === branchId) ?? { appointments: 0, staff: 0 };
  }

  return (
    <div className="p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Branches</h2>
        <p className="mt-1 text-sm text-gray-500">Multi-branch operations overview.</p>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : !branches?.length ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16">
            <GitBranch className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-900">No branches configured</p>
            <p className="mt-1 text-sm text-gray-500">Branches are managed by the Super Admin.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((b) => {
              const s = getStats(b.id);
              return (
                <div key={b.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{b.name}</p>
                      {b.city && <p className="mt-0.5 text-xs text-gray-500">{b.city}{b.state ? `, ${b.state}` : ""}</p>}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      b.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
                    }`}>
                      {b.status}
                      {b.is_primary && " · Primary"}
                    </span>
                  </div>
                  <dl className="mt-4 border-t border-gray-100 pt-3">
                    <div>
                      <dt className="text-xs text-gray-500">Staff Assigned</dt>
                      <dd className="mt-0.5 text-lg font-bold text-gray-900">{s.staff}</dd>
                    </div>
                  </dl>
                  {(b.phone || b.email) && (
                    <div className="mt-3 space-y-0.5 border-t border-gray-100 pt-3 text-xs text-gray-500">
                      {b.phone && <p>{b.phone}</p>}
                      {b.email && <p>{b.email}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
