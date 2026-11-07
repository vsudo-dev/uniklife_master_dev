import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { usePageView } from "@/hooks/use-activity-log";
import type { InvoiceStatus } from "@/types";

interface RevenueStats {
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  by_status: Partial<Record<InvoiceStatus, number>>;
}

interface WellnessStats {
  active_clients: number;
  active_enrollments: number;
  pending_plans: number;
  total_measurements: number;
}

interface ProgramEnrollment {
  program_name: string;
  total: number;
  active: number;
  completed: number;
}

function useRevenueStats(tenantId: string) {
  return useQuery({
    queryKey: ["revenue-stats", tenantId],
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<RevenueStats> => {
      const { data, error } = await supabase
        .from("crm_invoices")
        .select("amount, status")
        .eq("tenant_id", tenantId);
      if (error) throw error;

      const total_invoiced = (data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
      const paid = (data ?? []).filter((r) => r.status === "paid");
      const total_paid = paid.reduce((s, r) => s + (r.amount ?? 0), 0);
      const outstanding = (data ?? []).filter((r) => ["sent", "partial", "overdue"].includes(r.status));
      const total_outstanding = outstanding.reduce((s, r) => s + (r.amount ?? 0), 0);

      const by_status: Partial<Record<InvoiceStatus, number>> = {};
      for (const row of data ?? []) {
        by_status[row.status as InvoiceStatus] = (by_status[row.status as InvoiceStatus] ?? 0) + 1;
      }

      return { total_invoiced, total_paid, total_outstanding, by_status };
    },
  });
}

function useWellnessStats(tenantId: string) {
  return useQuery({
    queryKey: ["wellness-stats", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<WellnessStats> => {
      const [clients, enrollments, plans, measurements] = await Promise.all([
        supabase.from("wellness_clients").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("enrollment_status", "active"),
        supabase.from("wellness_enrollments").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "active"),
        supabase.from("care_plans").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "pending_approval"),
        supabase.from("health_measurements").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      ]);
      return {
        active_clients: clients.count ?? 0,
        active_enrollments: enrollments.count ?? 0,
        pending_plans: plans.count ?? 0,
        total_measurements: measurements.count ?? 0,
      };
    },
  });
}

function useProgramEnrollmentStats(tenantId: string) {
  return useQuery({
    queryKey: ["program-enrollment-stats", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<ProgramEnrollment[]> => {
      const { data, error } = await supabase
        .from("wellness_enrollments")
        .select("status, wellness_programs(name)")
        .eq("tenant_id", tenantId);
      if (error) throw error;

      const map = new Map<string, ProgramEnrollment>();
      for (const row of data ?? []) {
        const prog = row.wellness_programs as { name: string } | { name: string }[] | null;
        const name = prog === null ? "Unknown" : Array.isArray(prog) ? (prog[0]?.name ?? "Unknown") : (prog as { name: string }).name;
        const existing = map.get(name) ?? { program_name: name, total: 0, active: 0, completed: 0 };
        existing.total++;
        if (row.status === "active") existing.active++;
        if (row.status === "completed") existing.completed++;
        map.set(name, existing);
      }
      return Array.from(map.values()).sort((a, b) => b.total - a.total);
    },
  });
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const STATUS_COLORS: Partial<Record<InvoiceStatus, string>> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  partial: "bg-yellow-100 text-yellow-800",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export function ReportsPage({ tenantId }: { tenantId: string }) {
  usePageView("reports");
  const { data: revenue, isLoading: loadingRevenue } = useRevenueStats(tenantId);
  const { data: wellness, isLoading: loadingWellness } = useWellnessStats(tenantId);
  const { data: programs } = useProgramEnrollmentStats(tenantId);

  return (
    <div className="p-4 sm:p-6 space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Reports & Analytics</h2>
        <p className="mt-1 text-sm text-gray-500">Business performance and wellness outcomes.</p>
      </div>

      {/* Revenue */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">Revenue</h3>
        {loadingRevenue ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: "Total Invoiced", value: fmt(revenue?.total_invoiced ?? 0), color: "text-gray-900" },
                { label: "Collected", value: fmt(revenue?.total_paid ?? 0), color: "text-green-700" },
                { label: "Outstanding", value: fmt(revenue?.total_outstanding ?? 0), color: "text-red-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {revenue?.by_status && Object.keys(revenue.by_status).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {(Object.entries(revenue.by_status) as [InvoiceStatus, number][]).map(([status, count]) => (
                  <span key={status} className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700"}`}>
                    {status}: {count}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Wellness KPIs */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">Wellness KPIs</h3>
        {loadingWellness ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Active Clients", value: wellness?.active_clients ?? 0 },
              { label: "Active Enrollments", value: wellness?.active_enrollments ?? 0 },
              { label: "Plans Pending Approval", value: wellness?.pending_plans ?? 0 },
              { label: "Measurements Logged", value: wellness?.total_measurements ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Program Outcomes */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">Program Enrollment</h3>
        {!programs?.length ? (
          <p className="text-sm text-gray-500">No enrollment data yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Program", "Total Enrolled", "Active", "Completed", "Completion Rate"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {programs.map((p) => (
                  <tr key={p.program_name}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.program_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{p.total}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">{p.active}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">{p.completed}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full bg-gray-100">
                          <div
                            className="h-1.5 rounded-full bg-blue-500"
                            style={{ width: `${p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
