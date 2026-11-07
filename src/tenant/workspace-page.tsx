import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTodayAppointments, useAllTodayAppointments } from "@/hooks/use-workspace";
import { useUpdateAppointmentStatus } from "@/hooks/use-appointments";
import { useAddClientNote } from "@/hooks/use-client-notes";
import { useWellnessClients } from "@/hooks/use-wellness-clients";
import { useAuth } from "@/hooks/use-auth";
import type { WorkspaceAppointment, NoteType, AppointmentStatus } from "@/types";

const STATUS_ACTIONS: Partial<Record<string, { label: string; next: AppointmentStatus }[]>> = {
  scheduled:   [{ label: "Confirm", next: "confirmed" }, { label: "No Show", next: "no_show" }],
  confirmed:   [{ label: "Check In", next: "checked_in" }, { label: "No Show", next: "no_show" }],
  checked_in:  [{ label: "Start", next: "in_progress" }],
  in_progress: [{ label: "Complete", next: "completed" }],
};

const STATUS_COLOR: Record<string, string> = {
  scheduled:   "bg-blue-100 text-blue-800",
  confirmed:   "bg-indigo-100 text-indigo-800",
  checked_in:  "bg-yellow-100 text-yellow-800",
  in_progress: "bg-orange-100 text-orange-800",
  completed:   "bg-green-100 text-green-800",
  no_show:     "bg-red-100 text-red-700",
};

const STATUS_DOT: Record<string, string> = {
  scheduled:   "bg-blue-400",
  confirmed:   "bg-indigo-400",
  checked_in:  "bg-yellow-400",
  in_progress: "bg-orange-500 animate-pulse",
  completed:   "bg-green-500",
  no_show:     "bg-red-400",
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function initials(first: string, last?: string | null) {
  return `${first[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

export function WorkspacePage({ tenantId }: { tenantId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.platform_role === "super_admin" || user?.platform_role === "support_ops";

  const myAppts = useTodayAppointments(tenantId, user?.id ?? "");
  const allAppts = useAllTodayAppointments(tenantId);

  const appointments = isAdmin ? (allAppts.data ?? []) : (myAppts.data ?? []);
  const isLoading = isAdmin ? allAppts.isLoading : myAppts.isLoading;

  const updateStatus = useUpdateAppointmentStatus();
  const [quickNote, setQuickNote] = useState<WorkspaceAppointment | null>(null);

  const queue = appointments.filter((a) => ["checked_in", "in_progress"].includes(a.status));
  const upcoming = appointments.filter((a) => ["scheduled", "confirmed"].includes(a.status));
  const done = appointments.filter((a) => ["completed", "no_show"].includes(a.status));

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "Good morning" :
    now.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          {greeting}, {user?.full_name?.split(" ")[0] ?? "Doctor"}
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatChip label="Today's Total" value={appointments.length} color="blue" />
        <StatChip label="In Queue" value={queue.length} color="orange" />
        <StatChip label="Completed" value={done.filter((a) => a.status === "completed").length} color="green" />
        <StatChip label="No-Shows" value={done.filter((a) => a.status === "no_show").length} color="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Schedule timeline */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Today's Schedule</h2>
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading appointments...</p>
          ) : appointments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
              <p className="text-sm text-gray-500">No appointments scheduled for today.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {appointments.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appt={appt}
                  onStatusChange={(next) =>
                    updateStatus.mutate({ id: appt.id, status: next })
                  }
                  onQuickNote={() => setQuickNote(appt)}
                  onViewClient={() => {
                    // navigate to client — need client_id from wellness_clients lookup
                    navigate(`/t/clients`);
                  }}
                  isUpdating={updateStatus.isPending}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-5">
          {/* Queue */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              Client Queue
              {queue.length > 0 && (
                <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                  {queue.length}
                </span>
              )}
            </h2>
            {queue.length === 0 ? (
              <p className="text-sm text-gray-500">No clients in queue.</p>
            ) : (
              <div className="space-y-2">
                {queue.map((appt) => (
                  <QueueCard key={appt.id} appt={appt} onQuickNote={() => setQuickNote(appt)} />
                ))}
              </div>
            )}
          </div>

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Upcoming</h2>
              <div className="space-y-1.5">
                {upcoming.map((appt) => (
                  <div key={appt.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <span className="text-xs font-mono text-gray-500 w-14 shrink-0">{fmtTime(appt.scheduled_at)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {appt.contacts?.first_name} {appt.contacts?.last_name ?? ""}
                      </p>
                      <p className="truncate text-xs text-gray-500">{appt.services?.name}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLOR[appt.status] ?? ""}`}>
                      {appt.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Note Dialog */}
      {quickNote && (
        <QuickNoteDialog
          tenantId={tenantId}
          appointment={quickNote}
          userId={user!.id}
          onClose={() => setQuickNote(null)}
        />
      )}
    </div>
  );
}

// ── Appointment Card ──────────────────────────────────────────────────────────

function AppointmentCard({
  appt, onStatusChange, onQuickNote, onViewClient, isUpdating,
}: {
  appt: WorkspaceAppointment;
  onStatusChange: (next: AppointmentStatus) => void;
  onQuickNote: () => void;
  onViewClient: () => void;
  isUpdating: boolean;
}) {
  const actions = STATUS_ACTIONS[appt.status] ?? [];
  const isActive = appt.status === "in_progress";

  return (
    <div className={`rounded-lg border bg-white px-4 py-3 ${isActive ? "border-orange-300 ring-1 ring-orange-200" : "border-gray-200"}`}>
      <div className="flex items-start gap-3">
        {/* Time + dot */}
        <div className="shrink-0 text-center">
          <p className="text-xs font-mono font-semibold text-gray-700">{fmtTime(appt.scheduled_at)}</p>
          <div className={`mx-auto mt-1 h-2 w-2 rounded-full ${STATUS_DOT[appt.status] ?? "bg-gray-300"}`} />
        </div>

        {/* Avatar */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-royal-blue text-xs font-bold text-white">
          {initials(appt.contacts?.first_name ?? "?", appt.contacts?.last_name)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900">
              {appt.contacts?.first_name} {appt.contacts?.last_name ?? ""}
            </p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLOR[appt.status] ?? ""}`}>
              {appt.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {appt.services?.name} · {appt.duration_minutes} min
          </p>
          {appt.contacts?.phone && (
            <p className="text-xs text-gray-400">{appt.contacts.phone}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          {actions.map((act) => (
            <button
              key={act.next}
              onClick={() => onStatusChange(act.next)}
              disabled={isUpdating}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                act.next === "completed"
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : act.next === "no_show"
                  ? "border border-red-200 text-red-600 hover:bg-red-50"
                  : act.next === "in_progress"
                  ? "bg-orange-500 text-white hover:bg-orange-600"
                  : "bg-royal-blue text-white hover:bg-royal-blue-light"
              }`}
            >
              {act.label}
            </button>
          ))}
          <button
            onClick={onQuickNote}
            title="Add note"
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:border-gray-300 hover:text-gray-700"
          >
            + Note
          </button>
          <button
            onClick={onViewClient}
            title="View client"
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:border-gray-300 hover:text-gray-700"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Queue Card ────────────────────────────────────────────────────────────────

function QueueCard({ appt, onQuickNote }: { appt: WorkspaceAppointment; onQuickNote: () => void }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
      appt.status === "in_progress" ? "border-orange-300 bg-orange-50" : "border-yellow-200 bg-yellow-50"
    }`}>
      <div className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[appt.status] ?? ""}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {appt.contacts?.first_name} {appt.contacts?.last_name ?? ""}
        </p>
        <p className="text-xs text-gray-500">
          {fmtTime(appt.scheduled_at)} · {appt.services?.name}
        </p>
      </div>
      <button
        onClick={onQuickNote}
        className="shrink-0 text-xs text-gray-500 hover:text-gray-800"
      >
        + Note
      </button>
    </div>
  );
}

// ── Stats Chip ────────────────────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue:   "bg-blue-50 border-blue-200 text-blue-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    green:  "bg-green-50 border-green-200 text-green-700",
    red:    "bg-red-50 border-red-200 text-red-700",
  };
  return (
    <div className={`rounded-lg border p-4 ${colors[color] ?? "bg-gray-50 border-gray-200 text-gray-700"}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}

// ── Quick Note Dialog ─────────────────────────────────────────────────────────

function QuickNoteDialog({
  tenantId, appointment, userId, onClose,
}: {
  tenantId: string;
  appointment: WorkspaceAppointment;
  userId: string;
  onClose: () => void;
}) {
  const addNote = useAddClientNote();
  const { data: wellnessClients } = useWellnessClients(tenantId);

  const wellnessClient = wellnessClients?.find(
    (wc) => (wc.contacts as { id: string } | undefined)?.id === appointment.contact_id
  );

  const [noteType, setNoteType] = useState<NoteType>("session");
  const [content, setContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wellnessClient) return;

    await addNote.mutateAsync(
      {
        tenant_id: tenantId,
        client_id: wellnessClient.id,
        appointment_id: appointment.id,
        written_by: userId,
        note_type: noteType,
        content,
        is_private: isPrivate,
      },
      { onSuccess: onClose }
    );
  };

  const NOTE_TYPE_LABELS: Record<NoteType, string> = {
    session: "Session Note", progress: "Progress Note",
    general: "General", alert: "Alert", follow_up: "Follow-up",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Quick Note</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          {appointment.contacts?.first_name} {appointment.contacts?.last_name ?? ""}
          {" · "}
          <span className="text-gray-400">{appointment.services?.name} at {fmtTime(appointment.scheduled_at)}</span>
        </p>

        {!wellnessClient && (
          <p className="mb-3 rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
            This contact is not registered as a wellness client yet.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">Note Type</label>
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value as NoteType)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            >
              {Object.entries(NOTE_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700">Note *</label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your observation, instruction, or follow-up..."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="rounded border-gray-300"
            />
            Private note (only visible to you)
          </label>

          {addNote.isError && (
            <p className="text-sm text-red-600">{(addNote.error as Error).message}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
            <button
              type="submit"
              disabled={addNote.isPending || !wellnessClient || !content.trim()}
              className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-light disabled:opacity-50"
            >
              {addNote.isPending ? "Saving..." : "Save Note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
