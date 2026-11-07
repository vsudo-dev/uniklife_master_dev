import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/use-auth";
import { useContacts } from "@/hooks/use-contacts";
import { Calendar } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-indigo-100 text-indigo-800",
  scheduled: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
  no_show:   "bg-orange-100 text-orange-800",
  pending:   "bg-yellow-100 text-yellow-800",
};

function statusBadge(s: string) {
  const cls = STATUS_COLORS[s] ?? "bg-gray-100 text-gray-700";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{s.replace("_", " ")}</span>;
}

export function PortalAppointments() {
  const { user, activeTenantId } = useAuthStore();
  const tenantId = activeTenantId ?? "";

  const { viewMode } = useAuthStore();
  const { data: contacts } = useContacts(tenantId);
  const myContact = viewMode?.contactId
    ? contacts?.find((c) => c.id === viewMode.contactId)
    : contacts?.find((c) => c.auth_user_id === user?.auth_user_id);

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["portal-appointments", myContact?.id],
    enabled: !!myContact?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_appointments")
        .select("id, title, status, scheduled_at, end_at, staff_name")
        .eq("tenant_id", tenantId)
        .eq("contact_id", myContact!.id)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const now = new Date();
  const upcoming = appointments?.filter((a) => new Date(a.scheduled_at) >= now) ?? [];
  const past = appointments?.filter((a) => new Date(a.scheduled_at) < now) ?? [];

  if (isLoading) return <div className="p-6 text-sm text-gray-500">Loading…</div>;

  type Appt = { id: string; title: string | null; status: string; scheduled_at: string; end_at: string | null; staff_name: string | null };
  const AppointmentCard = ({ a }: { a: Appt }) => (
    <div className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
        <Calendar className="h-5 w-5 text-indigo-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900">{a.title ?? "Appointment"}</p>
          {statusBadge(a.status)}
        </div>
        <p className="mt-0.5 text-sm text-gray-500">
          {new Date(a.scheduled_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
        </p>
        {a.staff_name && <p className="text-xs text-gray-400 mt-0.5">With {a.staff_name}</p>}
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">My Appointments</h2>
        <p className="mt-1 text-sm text-gray-500">Your upcoming and past sessions</p>
      </div>

      {!myContact && (
        <p className="text-sm text-gray-500">Profile not linked. Contact your practitioner.</p>
      )}

      {myContact && !appointments?.length && (
        <p className="text-sm text-gray-500">No appointments found.</p>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">Upcoming</p>
          {upcoming.map((a) => <AppointmentCard key={a.id} a={a} />)}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">Past</p>
          {past.map((a) => <AppointmentCard key={a.id} a={a} />)}
        </div>
      )}
    </div>
  );
}
