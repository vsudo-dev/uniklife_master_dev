import { useState } from "react";
import { Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { usePageView } from "@/hooks/use-activity-log";

const STATUS_COLORS: Record<string, string> = {
  confirmed:  "bg-indigo-100 text-indigo-800",
  scheduled:  "bg-blue-100 text-blue-800",
  completed:  "bg-green-100 text-green-800",
  cancelled:  "bg-red-100 text-red-700",
  no_show:    "bg-orange-100 text-orange-800",
  pending:    "bg-yellow-100 text-yellow-800",
};

function statusColor(s: string) {
  return STATUS_COLORS[s] ?? "bg-gray-100 text-gray-700";
}

export function AppointmentsPage({ tenantId }: { tenantId: string }) {
  usePageView("appointments");
  const today = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(today);
  const [statusFilter, setStatusFilter] = useState("");

  const { data: appointments, isLoading, error } = useQuery({
    queryKey: ["crm_appointments", tenantId, dateFrom, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("crm_appointments")
        .select("id, title, status, scheduled_at, end_at, staff_name, crm_contact_id, contact_id, contacts(first_name, last_name)")
        .eq("tenant_id", tenantId)
        .gte("scheduled_at", `${dateFrom}T00:00:00`)
        .order("scheduled_at", { ascending: true });
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Appointments</h2>
          <p className="mt-1 text-sm text-gray-500">
            {appointments?.length ?? 0} appointments · synced from CRM
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-royal-blue focus:outline-none"
          />
        </div>
        <button
          onClick={() => setDateFrom(today)}
          className="text-sm text-royal-blue hover:underline"
        >
          Today
        </button>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-royal-blue focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
        </select>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">Could not load appointments.</p>
          <p className="mt-1 font-mono text-xs opacity-80">{(error as Error).message}</p>
        </div>
      )}

      <div className="mt-4">
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading appointments...</p>
        ) : !appointments?.length ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16">
            <Calendar className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-900">No appointments found</p>
            <p className="mt-1 text-sm text-gray-500">
              Create an appointment in the CRM to sync it here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Client", "Service", "Date & Time", "Status", "Duration"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {(() => {
                        const c = Array.isArray(a.contacts) ? a.contacts[0] : a.contacts;
                        const name = c ? [c.first_name, c.last_name].filter(Boolean).join(" ") : "";
                        return <p className="text-sm font-medium text-gray-900">{name || "—"}</p>;
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{a.title ?? "Appointment"}</p>
                      {a.staff_name && (
                        <p className="text-xs text-gray-500">{a.staff_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <p>{new Date(a.scheduled_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(a.scheduled_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        {a.end_at && ` – ${new Date(a.end_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColor(a.status)}`}>
                        {a.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {a.end_at
                        ? `${Math.round((new Date(a.end_at).getTime() - new Date(a.scheduled_at).getTime()) / 60000)} min`
                        : "—"}
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
