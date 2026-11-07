import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/hooks/use-auth";
import { useHealthMeasurements } from "@/hooks/use-health";
import { useEnrollments } from "@/hooks/use-programs";
import { useWellnessClients } from "@/hooks/use-wellness-clients";
import { supabase } from "@/lib/supabase";

// ─── Daily check-in widget ────────────────────────────────────────────────────

function CheckInWidget({ tenantId, clientId }: { tenantId: string; clientId: string }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);

  const { data: todayCheckIn } = useQuery({
    queryKey: ["portal-checkin-today", clientId, today],
    enabled: !!clientId,
    queryFn: async () => {
      const { data } = await supabase
        .from("check_ins")
        .select("id, mood_score, notes, completed_at")
        .eq("tenant_id", tenantId)
        .eq("client_id", clientId)
        .gte("scheduled_at", `${today}T00:00:00`)
        .lt("scheduled_at", `${today}T23:59:59`)
        .maybeSingle();
      return data;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (todayCheckIn) {
        const { error } = await supabase
          .from("check_ins")
          .update({ mood_score: mood, notes: note || null, completed_at: new Date().toISOString() })
          .eq("id", todayCheckIn.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("check_ins")
          .insert({ tenant_id: tenantId, client_id: clientId, scheduled_at: new Date().toISOString(), mood_score: mood, notes: note || null, completed_at: new Date().toISOString() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-checkin-today", clientId, today] });
      setDone(true);
    },
  });

  if (todayCheckIn?.completed_at || done) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5">
        <p className="text-sm font-semibold text-green-800">Today's check-in complete ✓</p>
        <p className="text-xs text-green-600 mt-0.5">Mood: {"⭐".repeat(todayCheckIn?.mood_score ?? mood ?? 0)}</p>
      </div>
    );
  }

  const MOODS = [
    { score: 1, label: "😔", tip: "Struggling" },
    { score: 2, label: "😕", tip: "Below average" },
    { score: 3, label: "😐", tip: "Okay" },
    { score: 4, label: "🙂", tip: "Good" },
    { score: 5, label: "😄", tip: "Great" },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm font-semibold text-gray-700 mb-3">Daily Check-In</p>
      <p className="text-xs text-gray-500 mb-3">How are you feeling today?</p>
      <div className="flex gap-2 mb-3">
        {MOODS.map(({ score, label, tip }) => (
          <button
            key={score}
            type="button"
            title={tip}
            onClick={() => setMood(score)}
            className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-all ${mood === score ? "ring-2 ring-royal-blue scale-110" : "hover:bg-gray-50"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <input
        type="text"
        placeholder="Any notes? (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-royal-blue focus:outline-none mb-3"
      />
      <button
        type="button"
        disabled={!mood || submit.isPending}
        onClick={() => submit.mutate()}
        className="rounded bg-royal-blue px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        {submit.isPending ? "Saving…" : "Submit Check-In"}
      </button>
      {submit.isError && <p className="mt-1 text-xs text-red-500">Failed to save. Try again.</p>}
    </div>
  );
}

// ─── Portal Home ─────────────────────────────────────────────────────────────

export function PortalHome() {
  const { user, activeTenantId } = useAuthStore();
  const tenantId = activeTenantId ?? "";

  const { viewMode } = useAuthStore();
  const { data: clients } = useWellnessClients(tenantId);
  const myClient = viewMode?.contactId
    ? clients?.find((c) => c.contact_id === viewMode.contactId)
    : clients?.find((c) => c.contacts?.auth_user_id === user?.auth_user_id);

  const { data: measurements } = useHealthMeasurements(myClient?.id ?? "");
  const { data: enrollments } = useEnrollments(myClient?.id ?? "");

  const { data: upcoming } = useQuery({
    queryKey: ["portal-upcoming-appts", myClient?.contact_id],
    enabled: !!myClient?.contact_id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("crm_appointments")
        .select("id, title, status, scheduled_at, staff_name")
        .eq("tenant_id", tenantId)
        .eq("contact_id", myClient!.contact_id)
        .gte("scheduled_at", now)
        .neq("status", "cancelled")
        .order("scheduled_at", { ascending: true })
        .limit(3);
      if (error) return [];
      return data;
    },
  });

  const latest = measurements?.[0];
  const activeEnrollments = enrollments?.filter((e) => e.status === "active") ?? [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Welcome back, {user?.full_name?.split(" ")[0] ?? "there"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">Your personal health dashboard</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Latest vitals */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Latest Vitals</p>
          {latest ? (
            <dl className="space-y-2">
              {[
                { label: "Weight", value: latest.weight_kg ? `${latest.weight_kg} kg` : null },
                { label: "BMI", value: latest.bmi?.toString() },
                { label: "Body Fat", value: latest.body_fat_pct ? `${latest.body_fat_pct}%` : null },
                { label: "BP", value: latest.blood_pressure_systolic ? `${latest.blood_pressure_systolic}/${latest.blood_pressure_diastolic}` : null },
              ].filter((f) => f.value).map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-semibold text-gray-900">{value}</dd>
                </div>
              ))}
              <p className="text-xs text-gray-400 pt-1">
                As of {new Date(latest.measurement_date).toLocaleDateString("en-IN")}
              </p>
            </dl>
          ) : (
            <p className="text-sm text-gray-500">No measurements recorded yet.</p>
          )}
        </div>

        {/* Active programs */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">My Programs</p>
          {!activeEnrollments.length ? (
            <p className="text-sm text-gray-500">Not enrolled in any program.</p>
          ) : (
            <div className="space-y-3">
              {activeEnrollments.map((e) => (
                <div key={e.id}>
                  <p className="text-sm font-medium text-gray-900">{e.wellness_programs?.name}</p>
                  <p className="text-xs text-gray-500">Until {new Date(e.end_date).toLocaleDateString("en-IN")}</p>
                  {e.sessions_total > 0 && (
                    <div className="mt-1.5 h-1.5 rounded-full bg-gray-100">
                      <div
                        className="h-1.5 rounded-full bg-royal-blue"
                        style={{ width: `${Math.min(100, (e.sessions_used / e.sessions_total) * 100)}%` }}
                      />
                    </div>
                  )}
                  <p className="mt-0.5 text-xs text-gray-400">{e.sessions_used} / {e.sessions_total} sessions</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming appointments */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Upcoming Appointments</p>
          {!upcoming?.length ? (
            <p className="text-sm text-gray-500">No upcoming appointments.</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((a) => (
                <div key={a.id}>
                  <p className="text-sm font-medium text-gray-900">{a.title ?? "Appointment"}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(a.scheduled_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  {a.staff_name && <p className="text-xs text-gray-400">With {a.staff_name}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily check-in */}
      {myClient && (
        <CheckInWidget tenantId={tenantId} clientId={myClient.id} />
      )}
    </div>
  );
}
