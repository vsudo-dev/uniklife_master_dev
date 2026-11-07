import { useState, type FormEvent } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { useCreateTenant } from "@/hooks/use-tenants";
import { useModules } from "@/hooks/use-modules";
import { useEntitlements, useBatchActivateModules } from "@/hooks/use-entitlements";
import { TIER_BUNDLES, resolveActivationOrder, type TierKey } from "@/lib/module-tiers";
import { cn } from "@/lib/cn";
import type { SubscriptionTier } from "@/types";

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const TIERS: TierKey[] = ["starter", "standard", "professional", "enterprise"];

interface Props {
  onClose: () => void;
}

export function CreateTenantDialog({ onClose }: Props) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TierKey>("standard");
  const [step, setStep] = useState<"form" | "activating" | "done">("form");
  const [newTenantId, setNewTenantId] = useState<string | null>(null);

  const createTenant = useCreateTenant();
  const { data: allModules = [] } = useModules();
  const { data: existingEntitlements = [] } = useEntitlements(newTenantId ?? undefined);
  const batchActivate = useBatchActivateModules();

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(toSlug(value));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const tenant = await createTenant.mutateAsync({
      name: name.trim(),
      slug: slug.trim(),
      subscription_tier: selectedTier as SubscriptionTier,
      status: "active",
    });

    setNewTenantId(tenant.id);
    setStep("activating");

    const bundle = TIER_BUNDLES[selectedTier];
    const orderedKeys = resolveActivationOrder(bundle.modules, allModules);

    await batchActivate.mutateAsync({
      tenantId: tenant.id,
      orderedKeys,
      allModules,
      existingEntitlements,
    });

    setStep("done");
  }

  if (step === "activating") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-royal-blue border-t-transparent" />
          <p className="text-sm font-medium text-gray-900">Setting up modules…</p>
          <p className="mt-1 text-xs text-gray-500">
            Activating {TIER_BUNDLES[selectedTier].label} bundle in dependency order
          </p>
        </div>
      </div>
    );
  }

  if (step === "done") {
    const bundle = TIER_BUNDLES[selectedTier];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-xl text-center">
          <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-green-500" />
          <p className="text-lg font-semibold text-gray-900">{name} is ready</p>
          <p className="mt-1 text-sm text-gray-500">
            {bundle.modules.length} modules activated — {bundle.label} bundle
          </p>
          <button
            onClick={onClose}
            className="mt-6 w-full rounded-lg bg-royal-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-royal-blue-light"
          >
            Go to Tenants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Create Tenant</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Name + Slug */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Organization Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
                placeholder="Healthy Fitness Clinic"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">URL Slug</label>
              <input
                type="text"
                required
                pattern="[a-z0-9-]+"
                value={slug}
                onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
                placeholder="healthy-fitness-clinic"
              />
              <p className="mt-1 text-xs text-gray-400">Portal: /join/{slug || "…"}</p>
            </div>
          </div>

          {/* Tier picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Module Bundle
              <span className="ml-2 text-xs font-normal text-gray-400">
                — activates automatically after creation
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TIERS.map((tier) => {
                const bundle = TIER_BUNDLES[tier];
                const isSelected = selectedTier === tier;
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setSelectedTier(tier)}
                    className={cn(
                      "rounded-lg border-2 p-3 text-left transition-all",
                      isSelected
                        ? "border-royal-blue bg-royal-blue/5"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">{bundle.label}</span>
                      <span className="text-xs text-gray-400">{bundle.modules.length} modules</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 leading-snug">{bundle.tagline}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* What gets activated */}
          <div className="rounded-lg bg-gray-50 px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Modules included in {TIER_BUNDLES[selectedTier].label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TIER_BUNDLES[selectedTier].modules.map((key) => (
                <span key={key} className="rounded bg-white border border-gray-200 px-2 py-0.5 text-xs font-mono text-gray-600">
                  {key}
                </span>
              ))}
            </div>
          </div>

          {createTenant.error && (
            <p className="text-sm text-red-600">{(createTenant.error as Error).message}</p>
          )}
          {batchActivate.error && (
            <p className="text-sm text-red-600">Module setup error: {(batchActivate.error as Error).message}</p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTenant.isPending || batchActivate.isPending}
              className="rounded-lg bg-royal-blue px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-royal-blue-light disabled:opacity-50"
            >
              {createTenant.isPending ? "Creating…" : "Create & Activate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
