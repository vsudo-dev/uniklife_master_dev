import { useAuthStore } from "@/hooks/use-auth";
import { useWellnessClients } from "@/hooks/use-wellness-clients";
import { useHealthAssessments } from "@/hooks/use-health";
import { useCarePlans } from "@/hooks/use-health";
import { useMealPlans } from "@/hooks/use-nutrition";

function GoalProgressBar({ current, target }: { current: number | null; target: number | null }) {
  if (!target) return null;
  const pct = Math.min(100, Math.round(((current ?? 0) / target) * 100));
  return (
    <div className="mt-1.5">
      <div className="h-1.5 w-full rounded-full bg-gray-100">
        <div className="h-1.5 rounded-full bg-royal-blue" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-0.5 text-xs text-gray-400">{current ?? 0} / {target} · {pct}%</p>
    </div>
  );
}

export function PortalHealth() {
  const { user, activeTenantId } = useAuthStore();
  const tenantId = activeTenantId ?? "";

  const { viewMode } = useAuthStore();
  const { data: clients } = useWellnessClients(tenantId);
  const myClient = viewMode?.contactId
    ? clients?.find((c) => c.contact_id === viewMode.contactId)
    : clients?.find((c) => c.contacts?.auth_user_id === user?.auth_user_id);
  const clientId = myClient?.id ?? "";

  const { data: assessments, isLoading: loadingA } = useHealthAssessments(clientId);
  const { data: carePlans, isLoading: loadingC } = useCarePlans(clientId);
  const { data: mealPlans, isLoading: loadingM } = useMealPlans(clientId);

  if (!myClient) return <div className="p-6 text-sm text-gray-500">Wellness profile not set up yet. Contact your practitioner.</div>;

  const isLoading = loadingA || loadingC || loadingM;
  if (isLoading) return <div className="p-6 text-sm text-gray-500">Loading…</div>;

  const latestAssessment = assessments?.[0];
  const activeMealPlan = mealPlans?.find((m) => m.status === "approved") ?? mealPlans?.[0];
  const activePlan = carePlans?.find((p) => p.status === "active") ?? carePlans?.[0];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">My Health</h2>
        <p className="mt-1 text-sm text-gray-500">Your health profile, care plan, and meal plan</p>
      </div>

      {/* Health assessment */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Health Overview</p>
        {!latestAssessment ? (
          <p className="text-sm text-gray-500">No health assessment on file.</p>
        ) : (
          <div className="space-y-3">
            {latestAssessment.height_cm && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Height</span>
                <span className="font-medium text-gray-900">{latestAssessment.height_cm} cm</span>
              </div>
            )}
            {latestAssessment.initial_weight_kg && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Starting Weight</span>
                <span className="font-medium text-gray-900">{latestAssessment.initial_weight_kg} kg</span>
              </div>
            )}
            {latestAssessment.existing_conditions && (latestAssessment.existing_conditions as unknown[]).length > 0 && (
              <div className="text-sm">
                <p className="text-gray-500 mb-1">Conditions</p>
                <div className="flex flex-wrap gap-1">
                  {(latestAssessment.existing_conditions as string[]).map((c, i) => (
                    <span key={i} className="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700">{c}</span>
                  ))}
                </div>
              </div>
            )}
            {latestAssessment.allergies && (latestAssessment.allergies as unknown[]).length > 0 && (
              <div className="text-sm">
                <p className="text-gray-500 mb-1">Allergies</p>
                <div className="flex flex-wrap gap-1">
                  {(latestAssessment.allergies as string[]).map((a, i) => (
                    <span key={i} className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">{a}</span>
                  ))}
                </div>
              </div>
            )}
            {latestAssessment.medical_history && (
              <div className="text-sm">
                <p className="text-gray-500 mb-0.5">Medical History</p>
                <p className="text-gray-700">{latestAssessment.medical_history}</p>
              </div>
            )}
            <p className="text-xs text-gray-400 pt-1">
              Assessed: {new Date(latestAssessment.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
            </p>
          </div>
        )}
      </div>

      {/* Care plan */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">My Care Plan</p>
        {!activePlan ? (
          <p className="text-sm text-gray-500">No active care plan.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">{activePlan.title}</p>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 capitalize">{activePlan.status}</span>
            </div>
            {activePlan.start_date && (
              <p className="text-xs text-gray-400">
                {new Date(activePlan.start_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                {activePlan.review_date && ` → Review: ${new Date(activePlan.review_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}`}
              </p>
            )}
            {activePlan.goals && (activePlan.goals as unknown[]).length > 0 && (
              <div className="mt-2 space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Goals</p>
                {(activePlan.goals as Array<{ title?: string; target?: number; current?: number; unit?: string }>).map((g, i) => (
                  <div key={i} className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-sm text-gray-800">{g.title ?? `Goal ${i + 1}`}</p>
                    {g.target != null && (
                      <GoalProgressBar current={g.current ?? null} target={g.target} />
                    )}
                    {g.unit && <p className="text-xs text-gray-400">{g.unit}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Meal plan */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">My Meal Plan</p>
        {!activeMealPlan ? (
          <p className="text-sm text-gray-500">No meal plan assigned yet.</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">{activeMealPlan.title}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${activeMealPlan.status === "approved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                {activeMealPlan.status}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {new Date(activeMealPlan.start_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}
              {" → "}
              {new Date(activeMealPlan.end_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}
            </p>
            <p className="text-xs text-gray-500 pt-1">Your practitioner manages the detailed meal schedule. Contact them for the full plan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
