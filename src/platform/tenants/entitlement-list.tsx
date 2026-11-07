import { useState } from "react";
import { CheckCircle2, PauseCircle, XCircle, Clock, AlertTriangle, Zap } from "lucide-react";
import {
  useEntitlements,
  useAssignModule,
  useTransitionEntitlement,
  useRemoveEntitlement,
  useBatchActivateModules,
} from "@/hooks/use-entitlements";
import { useModules } from "@/hooks/use-modules";
import { TIER_BUNDLES, resolveActivationOrder, missingDependencies, type TierKey } from "@/lib/module-tiers";
import { cn } from "@/lib/cn";
import type { TenantEntitlement, EntitlementStatus, GlobalModule } from "@/types";

// ── Status pill ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<EntitlementStatus, { label: string; icon: React.ElementType; className: string }> = {
  active:    { label: "Active",    icon: CheckCircle2, className: "text-green-700 bg-green-50" },
  pending:   { label: "Pending",   icon: Clock,        className: "text-yellow-700 bg-yellow-50" },
  suspended: { label: "Paused",    icon: PauseCircle,  className: "text-orange-700 bg-orange-50" },
  disabled:  { label: "Disabled",  icon: XCircle,      className: "text-gray-600 bg-gray-100" },
  expired:   { label: "Expired",   icon: XCircle,      className: "text-red-700 bg-red-50" },
};

function StatusPill({ status }: { status: EntitlementStatus }) {
  const { label, icon: Icon, className } = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", className)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// ── Activate-with-deps confirmation ───────────────────────────────────────────

function ActivateWithDepsModal({
  moduleKey,
  missing,
  allModules,
  onConfirm,
  onClose,
}: {
  moduleKey: string;
  missing: string[];
  allModules: GlobalModule[];
  onConfirm: (orderedKeys: string[]) => void;
  onClose: () => void;
}) {
  const keyToName = new Map(allModules.map((m) => [m.key, m.display_name]));
  const orderedKeys = resolveActivationOrder([moduleKey, ...missing], allModules);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Required modules missing
            </p>
            <p className="mt-1 text-xs text-gray-500">
              To activate <strong>{keyToName.get(moduleKey) ?? moduleKey}</strong>, these modules will also be activated in order:
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-1">
          {orderedKeys.map((key, i) => (
            <div key={key} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-royal-blue text-[10px] font-bold text-white shrink-0">
                {i + 1}
              </span>
              <span className="font-mono text-xs text-gray-400">{key}</span>
              <span className="text-xs text-gray-700">{keyToName.get(key) ?? key}</span>
              {key === moduleKey && (
                <span className="ml-auto text-xs font-medium text-royal-blue">← target</span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(orderedKeys)}
            className="flex-1 rounded-lg bg-royal-blue px-4 py-2 text-sm font-semibold text-white hover:bg-royal-blue-light"
          >
            Activate All
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Quick bundle setup ─────────────────────────────────────────────────────────

function BundleSetupBar({
  tenantId,
  allModules,
  entitlements,
}: {
  tenantId: string;
  allModules: GlobalModule[];
  entitlements: TenantEntitlement[];
}) {
  const [selectedTier, setSelectedTier] = useState<TierKey>("standard");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const batchActivate = useBatchActivateModules();

  async function handleSetup() {
    setBusy(true);
    const bundle = TIER_BUNDLES[selectedTier];
    const orderedKeys = resolveActivationOrder(bundle.modules, allModules);
    await batchActivate.mutateAsync({ tenantId, orderedKeys, allModules, existingEntitlements: entitlements });
    setBusy(false);
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3">
      <Zap className="h-4 w-4 shrink-0 text-amber-500" />
      <span className="text-sm font-medium text-gray-700">Quick setup:</span>
      <select
        value={selectedTier}
        onChange={(e) => setSelectedTier(e.target.value as TierKey)}
        className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:border-royal-blue"
      >
        {Object.entries(TIER_BUNDLES).map(([key, b]) => (
          <option key={key} value={key}>{b.label} ({b.modules.length} modules)</option>
        ))}
      </select>
      <button
        onClick={handleSetup}
        disabled={busy}
        className="rounded-lg bg-royal-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-royal-blue-light disabled:opacity-50"
      >
        {busy ? "Activating…" : done ? "✓ Done" : "Activate Bundle"}
      </button>
      {batchActivate.error && (
        <span className="text-xs text-red-600">{(batchActivate.error as Error).message}</span>
      )}
    </div>
  );
}

// ── Main list ─────────────────────────────────────────────────────────────────

export function EntitlementList({ tenantId }: { tenantId: string }) {
  const { data: entitlements = [], isLoading } = useEntitlements(tenantId);
  const { data: allModules = [] } = useModules();
  const [showAssign, setShowAssign] = useState(false);

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Module Entitlements</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {entitlements.filter(e => e.status === "active").length} active
            {" · "}{entitlements.length} total
          </p>
        </div>
        <button
          onClick={() => setShowAssign(true)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          + Assign single module
        </button>
      </div>

      {!isLoading && allModules.length > 0 && (
        <BundleSetupBar tenantId={tenantId} allModules={allModules} entitlements={entitlements} />
      )}

      {isLoading && <p className="mt-4 text-sm text-gray-500">Loading modules…</p>}

      {!isLoading && entitlements.length === 0 && (
        <p className="mt-2 text-sm text-gray-500">No modules assigned yet. Use Quick Setup above to get started.</p>
      )}

      {entitlements.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Module</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Expiry</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {entitlements.map((ent) => (
                <EntitlementRow
                  key={ent.id}
                  entitlement={ent}
                  tenantId={tenantId}
                  allModules={allModules}
                  allEntitlements={entitlements}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAssign && (
        <AssignModuleDialog
          tenantId={tenantId}
          existingModuleIds={entitlements.map((e) => e.module_id)}
          onClose={() => setShowAssign(false)}
        />
      )}
    </div>
  );
}

// ── Entitlement row ───────────────────────────────────────────────────────────

function EntitlementRow({
  entitlement: ent,
  tenantId,
  allModules,
  allEntitlements,
}: {
  entitlement: TenantEntitlement;
  tenantId: string;
  allModules: GlobalModule[];
  allEntitlements: TenantEntitlement[];
}) {
  const transition = useTransitionEntitlement();
  const remove = useRemoveEntitlement();
  const batchActivate = useBatchActivateModules();
  const [depsModal, setDepsModal] = useState<{ moduleKey: string; missing: string[] } | null>(null);

  const mod = ent.global_modules;
  const activeKeys = new Set(allEntitlements.filter(e => e.status === "active").map(e => e.global_modules?.key).filter(Boolean) as string[]);

  function handleActivate() {
    if (!mod) return;
    const missing = missingDependencies(mod.key, allModules, activeKeys);
    if (missing.length > 0) {
      setDepsModal({ moduleKey: mod.key, missing });
      return;
    }
    transition.reset();
    transition.mutate({ entitlement_id: ent.id, new_status: "active", tenant_id: tenantId });
  }

  async function handleActivateWithDeps(orderedKeys: string[]) {
    setDepsModal(null);
    await batchActivate.mutateAsync({
      tenantId,
      orderedKeys,
      allModules,
      existingEntitlements: allEntitlements,
    });
  }

  function handleTransition(to: EntitlementStatus) {
    if (to === "active") { handleActivate(); return; }
    const destructive = to === "disabled" || to === "suspended";
    if (destructive && !confirm(`${to === "disabled" ? "Disable" : "Pause"} "${mod?.display_name}"?`)) return;
    transition.reset();
    transition.mutate({ entitlement_id: ent.id, new_status: to, tenant_id: tenantId });
  }

  const TRANSITIONS: Record<EntitlementStatus, { label: string; to: EntitlementStatus }[]> = {
    pending:   [{ label: "Activate", to: "active" }, { label: "Disable", to: "disabled" }],
    active:    [{ label: "Pause", to: "suspended" }, { label: "Disable", to: "disabled" }],
    suspended: [{ label: "Reactivate", to: "active" }, { label: "Disable", to: "disabled" }],
    disabled:  [{ label: "Re-enable", to: "pending" }],
    expired:   [{ label: "Re-enable", to: "pending" }],
  };

  const actions = TRANSITIONS[ent.status] ?? [];
  const isLoading = transition.isPending || batchActivate.isPending;

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3">
          <div className="text-sm font-medium text-gray-900">{mod?.display_name ?? "Unknown"}</div>
          <div className="text-xs text-gray-400">{mod?.description ?? ""}</div>
        </td>
        <td className="px-4 py-3">
          <span className="text-xs capitalize text-gray-500">{mod?.layer ?? "—"}</span>
          <span className="ml-2 font-mono text-xs text-gray-300">{mod?.key}</span>
        </td>
        <td className="px-4 py-3">
          <StatusPill status={ent.status} />
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">
          {ent.expiry_date ? new Date(ent.expiry_date).toLocaleDateString() : "—"}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1 flex-wrap">
            {actions.map((a) => (
              <button
                key={a.to}
                onClick={() => handleTransition(a.to)}
                disabled={isLoading}
                className={cn(
                  "rounded px-2 py-1 text-xs font-medium disabled:opacity-50",
                  a.to === "active"
                    ? "bg-green-50 text-green-700 hover:bg-green-100"
                    : a.to === "disabled"
                    ? "text-red-600 hover:bg-red-50"
                    : "text-royal-blue hover:bg-royal-blue/5"
                )}
              >
                {a.label}
              </button>
            ))}
            <button
              onClick={() => { if (confirm(`Remove "${mod?.display_name}"?`)) remove.mutate({ id: ent.id, tenant_id: tenantId }); }}
              className="rounded px-2 py-1 text-xs font-medium text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              Remove
            </button>
          </div>
          {(transition.isError || batchActivate.isError) && (
            <p className="mt-1 text-xs text-red-600">
              {((transition.error || batchActivate.error) as Error)?.message}
            </p>
          )}
        </td>
      </tr>

      {depsModal && (
        <ActivateWithDepsModal
          moduleKey={depsModal.moduleKey}
          missing={depsModal.missing}
          allModules={allModules}
          onConfirm={handleActivateWithDeps}
          onClose={() => setDepsModal(null)}
        />
      )}
    </>
  );
}

// ── Assign single module dialog ───────────────────────────────────────────────

function AssignModuleDialog({
  tenantId,
  existingModuleIds,
  onClose,
}: {
  tenantId: string;
  existingModuleIds: string[];
  onClose: () => void;
}) {
  const { data: modules } = useModules();
  const assign = useAssignModule();
  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState("");

  const available = modules?.filter((m) => !existingModuleIds.includes(m.id) && m.lifecycle_status !== "removed");

  const byLayer = (available ?? []).reduce<Record<string, GlobalModule[]>>((acc, m) => {
    (acc[m.layer] = acc[m.layer] ?? []).push(m);
    return acc;
  }, {});

  const LAYER_ORDER = ["platform", "core", "vertical", "addon"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    assign.mutate(
      { tenant_id: tenantId, module_id: selectedId, change_reason: reason || undefined },
      { onSuccess: onClose }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900">Assign Single Module</h3>
        <p className="mt-1 text-xs text-gray-500">
          The module will be added as "Pending" — click Activate on the row to enable it.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Module</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-royal-blue"
              required
            >
              <option value="">Select a module…</option>
              {LAYER_ORDER.map((layer) =>
                byLayer[layer]?.length ? (
                  <optgroup key={layer} label={layer.charAt(0).toUpperCase() + layer.slice(1)}>
                    {byLayer[layer].map((m) => (
                      <option key={m.id} value={m.id}>
                        [{m.key}] {m.display_name}
                      </option>
                    ))}
                  </optgroup>
                ) : null
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Reason (optional)</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Added for pilot program"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-royal-blue"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
            <button
              type="submit"
              disabled={assign.isPending || !selectedId}
              className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-semibold text-white hover:bg-royal-blue-light disabled:opacity-50"
            >
              {assign.isPending ? "Assigning…" : "Assign Module"}
            </button>
          </div>
        </form>
        {assign.isError && <p className="mt-3 text-sm text-red-600">{(assign.error as Error).message}</p>}
      </div>
    </div>
  );
}
