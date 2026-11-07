import { useState } from "react";
import { Plus, ClipboardList } from "lucide-react";
import { useAuthStore } from "@/hooks/use-auth";
import { usePrograms, useCreateProgram, useUpdateProgram } from "@/hooks/use-programs";
import type { WellnessProgram, ProgramType, ProgramStatus } from "@/types";

const TYPE_LABELS: Record<ProgramType, string> = {
  weight_loss: "Weight Loss",
  fitness: "Fitness",
  nutrition: "Nutrition",
  wellness: "Wellness",
  custom: "Custom",
};

const STATUS_COLORS: Record<ProgramStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-800",
  archived: "bg-red-100 text-red-700",
};

export function ProgramsPage({ tenantId }: { tenantId: string }) {
  const { user } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const { data: programs, isLoading } = usePrograms(tenantId);
  const updateProgram = useUpdateProgram();

  function toggleStatus(p: WellnessProgram) {
    const next: ProgramStatus = p.status === "active" ? "archived" : "active";
    updateProgram.mutate({ id: p.id, status: next });
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Programs</h2>
          <p className="mt-1 text-sm text-gray-500">Wellness programs clients can enroll in.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-light"
        >
          <Plus className="h-4 w-4" />
          New Program
        </button>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : !programs?.length ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16">
            <ClipboardList className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-900">No programs yet</p>
            <p className="mt-1 text-sm text-gray-500">Create your first wellness program.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((p) => (
              <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{TYPE_LABELS[p.program_type]}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[p.status]}`}>
                    {p.status}
                  </span>
                </div>
                {p.description && (
                  <p className="mt-2 text-xs text-gray-600 line-clamp-2">{p.description}</p>
                )}
                <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3">
                  <div>
                    <dt className="text-xs text-gray-500">Duration</dt>
                    <dd className="text-sm font-medium text-gray-900">{p.duration_days}d</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Sessions</dt>
                    <dd className="text-sm font-medium text-gray-900">{p.session_credits}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Price</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {p.price > 0 ? `₹${p.price.toLocaleString("en-IN")}` : "Free"}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => toggleStatus(p)}
                    disabled={updateProgram.isPending}
                    className={`rounded px-3 py-1 text-xs font-medium ${
                      p.status === "active"
                        ? "text-red-600 hover:bg-red-50"
                        : "text-green-700 hover:bg-green-50"
                    }`}
                  >
                    {p.status === "active" ? "Archive" : "Activate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateProgramModal
          tenantId={tenantId}
          createdBy={user?.id ?? ""}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

function CreateProgramModal({
  tenantId,
  onClose,
}: {
  tenantId: string;
  createdBy?: string;
  onClose: () => void;
}) {
  const createProgram = useCreateProgram();
  const [form, setForm] = useState({
    name: "",
    description: "",
    program_type: "weight_loss" as ProgramType,
    duration_days: 90,
    price: 0,
    session_credits: 12,
    requires_payment: false,
    refund_policy: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createProgram.mutateAsync({
      tenant_id: tenantId,
      name: form.name,
      description: form.description || undefined,
      program_type: form.program_type,
      duration_days: form.duration_days,
      price: form.price,
      session_credits: form.session_credits,
      requires_payment: form.requires_payment,
      refund_policy: form.refund_policy || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-base font-semibold text-gray-900">New Program</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Program Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal-blue focus:outline-none"
              placeholder="e.g. 12-Week Weight Loss Program"
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.program_type}
                onChange={(e) => setForm({ ...form, program_type: e.target.value as ProgramType })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal-blue focus:outline-none"
              >
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Duration (days)</label>
              <input
                type="number"
                value={form.duration_days}
                onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })}
                min={1}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal-blue focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Price (₹)</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                min={0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Session Credits</label>
              <input
                type="number"
                value={form.session_credits}
                onChange={(e) => setForm({ ...form, session_credits: Number(e.target.value) })}
                min={0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal-blue focus:outline-none"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.requires_payment}
              onChange={(e) => setForm({ ...form, requires_payment: e.target.checked })}
              className="rounded"
            />
            Requires payment to enroll
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button
              type="submit"
              disabled={createProgram.isPending}
              className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-light disabled:opacity-50"
            >
              {createProgram.isPending ? "Saving…" : "Create Program"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
