import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Plus, Activity } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useWellnessClients } from "@/hooks/use-wellness-clients";
import type { GoalStatus } from "@/types";

interface ClientGoal {
  id: string;
  tenant_id: string;
  client_id: string;
  title: string;
  description: string | null;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  status: GoalStatus;
  due_date: string | null;
  created_at: string;
  wellness_clients: { display_name: string } | null;
}

interface CheckIn {
  id: string;
  tenant_id: string;
  client_id: string;
  practitioner_id: string | null;
  scheduled_at: string;
  completed_at: string | null;
  notes: string | null;
  mood_score: number | null;
  wellness_clients: { display_name: string } | null;
}

function useClientGoals(tenantId: string) {
  return useQuery({
    queryKey: ["client-goals", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_goals")
        .select("*, wellness_clients(display_name)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ClientGoal[];
    },
  });
}

function useCheckIns(tenantId: string) {
  return useQuery({
    queryKey: ["check-ins", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("check_ins")
        .select("*, wellness_clients(display_name)")
        .eq("tenant_id", tenantId)
        .order("scheduled_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as CheckIn[];
    },
  });
}

function useCompleteCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes, mood_score, tenant_id }: { id: string; notes: string; mood_score: number | null; tenant_id: string }) => {
      const { data, error } = await supabase
        .from("check_ins")
        .update({ completed_at: new Date().toISOString(), notes, mood_score })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, tenant_id };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["check-ins", data.tenant_id] });
    },
  });
}

function useUpdateGoalStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, current_value, tenant_id }: { id: string; status: GoalStatus; current_value?: number; tenant_id: string }) => {
      const payload: Partial<ClientGoal> = { status };
      if (current_value !== undefined) payload.current_value = current_value;
      const { data, error } = await supabase
        .from("client_goals")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, tenant_id };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["client-goals", data.tenant_id] });
    },
  });
}

function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tenant_id: string;
      client_id: string;
      title: string;
      description?: string;
      target_value?: number;
      unit?: string;
      due_date?: string;
    }) => {
      const { data, error } = await supabase
        .from("client_goals")
        .insert({ ...input, status: "not_started" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["client-goals", vars.tenant_id] });
    },
  });
}

const GOAL_STATUS_COLORS: Record<GoalStatus, string> = {
  not_started: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-800",
  achieved: "bg-green-100 text-green-800",
  abandoned: "bg-red-100 text-red-700",
};

const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  achieved: "Achieved",
  abandoned: "Abandoned",
};

const MOOD_LABELS: Record<number, string> = { 1: "Very Low", 2: "Low", 3: "Neutral", 4: "Good", 5: "Excellent" };

export function ProgressReviewsPage({ tenantId }: { tenantId: string }) {
  const [tab, setTab] = useState<"check-ins" | "goals">("check-ins");
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<CheckIn | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [completionMood, setCompletionMood] = useState<number>(3);

  const { data: checkIns, isLoading: loadingCheckIns } = useCheckIns(tenantId);
  const { data: goals, isLoading: loadingGoals } = useClientGoals(tenantId);
  const completeCheckIn = useCompleteCheckIn();
  const updateGoalStatus = useUpdateGoalStatus();

  const upcoming = checkIns?.filter((c) => !c.completed_at) ?? [];
  const completed = checkIns?.filter((c) => !!c.completed_at) ?? [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Progress Reviews</h2>
          <p className="mt-1 text-sm text-gray-500">Client check-ins and goal tracking.</p>
        </div>
        {tab === "goals" && (
          <button
            onClick={() => setShowCreateGoal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-light"
          >
            <Plus className="h-4 w-4" />
            Add Goal
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
        {(["check-ins", "goals"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "check-ins" ? "Check-ins" : "Goals"}
          </button>
        ))}
      </div>

      {/* Check-ins tab */}
      {tab === "check-ins" && (
        <div className="space-y-6">
          {loadingCheckIns ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : !checkIns?.length ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16">
              <Activity className="h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-900">No check-ins scheduled</p>
              <p className="mt-1 text-sm text-gray-500">Check-ins are created from client detail pages.</p>
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Pending ({upcoming.length})</h3>
                  <div className="space-y-2">
                    {upcoming.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.wellness_clients?.display_name ?? "Unknown Client"}</p>
                          <p className="text-xs text-gray-500">
                            Scheduled: {new Date(c.scheduled_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <button
                          onClick={() => { setCompleteTarget(c); setCompletionNotes(""); setCompletionMood(3); }}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Complete
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {completed.length > 0 && (
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Completed</h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50">
                        <tr>
                          {["Client", "Completed", "Mood", "Notes"].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {completed.map((c) => (
                          <tr key={c.id}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.wellness_clients?.display_name ?? "—"}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{c.completed_at ? new Date(c.completed_at).toLocaleDateString("en-IN") : "—"}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{c.mood_score ? `${c.mood_score}/5 — ${MOOD_LABELS[c.mood_score]}` : "—"}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{c.notes ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* Goals tab */}
      {tab === "goals" && (
        <div>
          {loadingGoals ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : !goals?.length ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16">
              <CheckCircle className="h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-900">No goals set</p>
              <p className="mt-1 text-sm text-gray-500">Add goals for clients to track their progress.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {["Client", "Goal", "Progress", "Due", "Status", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {goals.map((g) => {
                    const pct = g.target_value && g.current_value !== null
                      ? Math.min(100, Math.round((g.current_value / g.target_value) * 100))
                      : null;
                    return (
                      <tr key={g.id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{g.wellness_clients?.display_name ?? "—"}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{g.title}</p>
                          {g.description && <p className="text-xs text-gray-500 line-clamp-1">{g.description}</p>}
                        </td>
                        <td className="px-4 py-3">
                          {pct !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 rounded-full bg-gray-100">
                                <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-500">
                                {g.current_value}/{g.target_value} {g.unit ?? ""}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {g.due_date ? new Date(g.due_date).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${GOAL_STATUS_COLORS[g.status]}`}>
                            {GOAL_STATUS_LABELS[g.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {g.status !== "achieved" && g.status !== "abandoned" && (
                            <select
                              value={g.status}
                              onChange={(e) => updateGoalStatus.mutate({ id: g.id, status: e.target.value as GoalStatus, tenant_id: g.tenant_id })}
                              className="rounded border border-gray-300 px-1.5 py-1 text-xs text-gray-700 focus:outline-none"
                            >
                              <option value="not_started">Not Started</option>
                              <option value="in_progress">In Progress</option>
                              <option value="achieved">Achieved</option>
                              <option value="abandoned">Abandoned</option>
                            </select>
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
      )}

      {/* Complete check-in modal */}
      {completeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">Complete Check-in</h3>
              <button onClick={() => setCompleteTarget(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <p className="text-sm text-gray-700">
                Client: <span className="font-medium">{completeTarget.wellness_clients?.display_name}</span>
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mood Score (1–5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setCompletionMood(n)}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                        completionMood === n ? "border-royal-blue bg-royal-blue text-white" : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-500">{MOOD_LABELS[completionMood]}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal-blue focus:outline-none"
                  placeholder="Session notes, observations..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button onClick={() => setCompleteTarget(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                <button
                  onClick={() => {
                    completeCheckIn.mutate(
                      { id: completeTarget.id, notes: completionNotes, mood_score: completionMood, tenant_id: completeTarget.tenant_id },
                      { onSuccess: () => setCompleteTarget(null) }
                    );
                  }}
                  disabled={completeCheckIn.isPending}
                  className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-light disabled:opacity-50"
                >
                  {completeCheckIn.isPending ? "Saving…" : "Mark Complete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create goal modal */}
      {showCreateGoal && (
        <CreateGoalModal tenantId={tenantId} onClose={() => setShowCreateGoal(false)} />
      )}
    </div>
  );
}

function CreateGoalModal({ tenantId, onClose }: { tenantId: string; onClose: () => void }) {
  const { data: clients } = useWellnessClients(tenantId);
  const createGoal = useCreateGoal();
  const [form, setForm] = useState({
    client_id: "",
    title: "",
    description: "",
    target_value: "",
    unit: "",
    due_date: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createGoal.mutateAsync({
      tenant_id: tenantId,
      client_id: form.client_id,
      title: form.title,
      description: form.description || undefined,
      target_value: form.target_value ? Number(form.target_value) : undefined,
      unit: form.unit || undefined,
      due_date: form.due_date || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-base font-semibold text-gray-900">Add Goal</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Client *</label>
            <select
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal-blue focus:outline-none"
            >
              <option value="">Select client</option>
              {clients?.map((c) => {
                const name = c.contacts ? `${c.contacts.first_name}${c.contacts.last_name ? " " + c.contacts.last_name : ""}` : c.id;
                return <option key={c.id} value={c.id}>{name}</option>;
              })}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Goal Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal-blue focus:outline-none"
              placeholder="e.g. Lose 10 kg by December"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal-blue focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Target Value</label>
              <input
                type="number"
                value={form.target_value}
                onChange={(e) => setForm({ ...form, target_value: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal-blue focus:outline-none"
                placeholder="e.g. 70"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
              <input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal-blue focus:outline-none"
                placeholder="e.g. kg, steps"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal-blue focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button
              type="submit"
              disabled={createGoal.isPending}
              className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-light disabled:opacity-50"
            >
              {createGoal.isPending ? "Saving…" : "Add Goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
