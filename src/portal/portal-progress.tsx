import { useAuthStore } from "@/hooks/use-auth";
import { useHealthMeasurements } from "@/hooks/use-health";
import { useWellnessClients } from "@/hooks/use-wellness-clients";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

function trend(values: (number | null | undefined)[]) {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length < 2 || nums[0] == null || nums[1] == null) return null;
  const diff = nums[0] - nums[1];
  if (Math.abs(diff) < 0.01) return { dir: "flat" as const, diff: 0 };
  return { dir: diff < 0 ? ("down" as const) : ("up" as const), diff: Math.abs(diff) };
}

export function PortalProgress() {
  const { user, activeTenantId } = useAuthStore();
  const tenantId = activeTenantId ?? "";

  const { viewMode } = useAuthStore();
  const { data: clients } = useWellnessClients(tenantId);
  const myClient = viewMode?.contactId
    ? clients?.find((c) => c.contact_id === viewMode.contactId)
    : clients?.find((c) => c.contacts?.auth_user_id === user?.auth_user_id);

  const { data: measurements, isLoading } = useHealthMeasurements(myClient?.id ?? "");

  if (isLoading) return <div className="p-6 text-sm text-gray-500">Loading…</div>;
  if (!myClient) return <div className="p-6 text-sm text-gray-500">Wellness profile not set up yet. Contact your practitioner.</div>;
  if (!measurements?.length || !measurements[0]) return <div className="p-6 text-sm text-gray-500">No measurements recorded yet.</div>;

  const latest = measurements[0];
  const weightTrend = trend(measurements.slice(0, 3).map((m) => m.weight_kg));
  const bmiTrend = trend(measurements.slice(0, 3).map((m) => m.bmi));

  const TrendIcon = ({ dir }: { dir: "up" | "down" | "flat" }) =>
    dir === "down" ? <TrendingDown className="h-4 w-4 text-green-500" /> :
    dir === "up"   ? <TrendingUp   className="h-4 w-4 text-red-400"   /> :
                     <Minus         className="h-4 w-4 text-gray-400"  />;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">My Progress</h2>
        <p className="mt-1 text-sm text-gray-500">Track your health measurements over time</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Weight", value: latest.weight_kg ? `${latest.weight_kg} kg` : null, t: weightTrend },
          { label: "BMI", value: latest.bmi?.toString() ?? null, t: bmiTrend },
          { label: "Body Fat", value: latest.body_fat_pct ? `${latest.body_fat_pct}%` : null, t: null },
          { label: "Waist", value: latest.waist_cm ? `${latest.waist_cm} cm` : null, t: null },
        ].map(({ label, value, t }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <div className="mt-1 flex items-end justify-between">
              <p className="text-2xl font-semibold text-gray-900">{value ?? "—"}</p>
              {t && <TrendIcon dir={t.dir} />}
            </div>
            {t && t.diff > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                {t.dir === "down" ? "▼" : "▲"} {t.diff.toFixed(1)} from prev
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Vitals card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Latest Vitals</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Blood Pressure", value: latest.blood_pressure_systolic ? `${latest.blood_pressure_systolic}/${latest.blood_pressure_diastolic} mmHg` : null },
            { label: "Resting HR", value: latest.resting_heart_rate ? `${latest.resting_heart_rate} bpm` : null },
            { label: "Sleep", value: latest.sleep_hours ? `${latest.sleep_hours} hrs` : null },
            { label: "Activity", value: latest.activity_minutes ? `${latest.activity_minutes} min` : null },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{value ?? "—"}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Last recorded: {new Date(latest.measurement_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}
        </p>
      </div>

      {/* Measurement history table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">Measurement History</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Date", "Weight", "BMI", "Body Fat", "Waist", "Hip", "BP", "HR"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {measurements.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 whitespace-nowrap text-gray-700">
                    {new Date(m.measurement_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </td>
                  <td className="px-4 py-2.5">{m.weight_kg ?? "—"}</td>
                  <td className="px-4 py-2.5">{m.bmi ?? "—"}</td>
                  <td className="px-4 py-2.5">{m.body_fat_pct ? `${m.body_fat_pct}%` : "—"}</td>
                  <td className="px-4 py-2.5">{m.waist_cm ?? "—"}</td>
                  <td className="px-4 py-2.5">{m.hip_cm ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    {m.blood_pressure_systolic ? `${m.blood_pressure_systolic}/${m.blood_pressure_diastolic}` : "—"}
                  </td>
                  <td className="px-4 py-2.5">{m.resting_heart_rate ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
