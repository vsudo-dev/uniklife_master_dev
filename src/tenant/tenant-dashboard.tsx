import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/hooks/use-auth";
import { useTenantContext } from "@/contexts/tenant-context";
import { supabase } from "@/lib/supabase";

function useTenantStats(tenantId: string) {
  return useQuery({
    queryKey: ["tenant-stats", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const [clients, enrollments, carePlans] = await Promise.all([
        supabase.from("wellness_clients").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("enrollment_status", "active"),
        supabase.from("wellness_enrollments").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "active"),
        supabase.from("care_plans").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "pending_approval"),
      ]);
      return {
        activeClients: clients.count ?? 0,
        activeEnrollments: enrollments.count ?? 0,
        pendingPlans: carePlans.count ?? 0,
      };
    },
  });
}

const APPT_STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  confirmed: "bg-indigo-100 text-indigo-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-orange-100 text-orange-800",
  pending: "bg-yellow-100 text-yellow-800",
};

function useTodayAppointments(tenantId: string) {
  const today = new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ["crm_appts_today", tenantId, today],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_appointments")
        .select("id, title, status, scheduled_at, staff_name, contacts(first_name, last_name)")
        .eq("tenant_id", tenantId)
        .gte("scheduled_at", `${today}T00:00:00`)
        .lte("scheduled_at", `${today}T23:59:59`)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function TenantDashboard() {
  const { activeRole } = useAuthStore();
  const { tenantId } = useTenantContext();
  const today = new Date().toISOString().slice(0, 10);

  const { data: stats } = useTenantStats(tenantId);
  const { data: todayAppts } = useTodayAppointments(tenantId);

  const upcoming = (todayAppts ?? []).filter((a) =>
    !["completed", "cancelled", "no_show"].includes(a.status)
  );

  return (
    <div className="p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500 capitalize">
          {today} · Role: <span className="font-medium">{activeRole?.replace("_", " ")}</span>
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Active Clients", value: stats?.activeClients ?? "—" },
          { label: "Active Enrollments", value: stats?.activeEnrollments ?? "—" },
          { label: "Plans Pending Approval", value: stats?.pendingPlans ?? "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Today's Appointments{upcoming.length > 0 ? ` (${upcoming.length})` : ""}
        </h3>
        {!upcoming.length ? (
          <p className="text-sm text-gray-500">No upcoming appointments today.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            {upcoming.map((a, i) => {
              const c = Array.isArray(a.contacts) ? a.contacts[0] : a.contacts;
              const clientName = c ? [c.first_name, c.last_name].filter(Boolean).join(" ") : "—";
              return (
                <div key={a.id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-gray-100" : ""}`}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{clientName}</p>
                    <p className="text-xs text-gray-500">
                      {a.title ?? "Appointment"} · {new Date(a.scheduled_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${APPT_STATUS_COLORS[a.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {a.status.replace(/_/g, " ")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
