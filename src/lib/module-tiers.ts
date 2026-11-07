import type { GlobalModule } from "@/types";

// Module bundles per tier — ordered loosely, but resolveActivationOrder
// guarantees correct dependency order at activation time.
export type TierKey = "starter" | "standard" | "professional" | "enterprise";

export const TIER_BUNDLES: Record<TierKey, { label: string; tagline: string; color: string; modules: string[] }> = {
  starter: {
    label: "Starter",
    tagline: "Solo practitioner — clients, appointments, basic wellness tracking",
    color: "border-blue-200 bg-blue-50",
    modules: ["C01", "C02", "C03", "W01", "W02", "W03", "W04"],
  },
  standard: {
    label: "Standard",
    tagline: "Growing clinic — + care plans, nutrition, programs, client portal",
    color: "border-indigo-200 bg-indigo-50",
    modules: ["C01", "C02", "C03", "C04", "W01", "W02", "W03", "W04", "W05", "W06", "W10", "W12", "W13"],
  },
  professional: {
    label: "Professional",
    tagline: "Full clinic — + AI assistant, gallery, consent management, supplement tracking",
    color: "border-purple-200 bg-purple-50",
    modules: [
      "C01", "C02", "C03", "C04", "C05",
      "W01", "W02", "W03", "W04", "W05", "W06", "W07",
      "W08", "W09", "W10", "W11", "W12", "W13",
      "W16", "W22", "W23",
    ],
  },
  enterprise: {
    label: "Enterprise",
    tagline: "Everything — all modules including add-ons, multi-branch, AI",
    color: "border-amber-200 bg-amber-50",
    modules: [
      "C01", "C02", "C03", "C04", "C05", "C06",
      "W01", "W02", "W03", "W04", "W05", "W06", "W07",
      "W08", "W09", "W10", "W11", "W12", "W13",
      "W16", "W17", "W22", "W23", "W24",
    ],
  },
};

// Topological sort: returns module keys in activation order (dependencies first).
export function resolveActivationOrder(targetKeys: string[], allModules: GlobalModule[]): string[] {
  const keyToMod = new Map(allModules.map((m) => [m.key, m]));
  const visited = new Set<string>();
  const order: string[] = [];

  function visit(key: string) {
    if (visited.has(key)) return;
    const mod = keyToMod.get(key);
    if (!mod) return;
    for (const dep of mod.dependencies ?? []) {
      if (dep.type === "required") visit(dep.module_key);
    }
    visited.add(key);
    order.push(key);
  }

  for (const key of targetKeys) visit(key);
  return order;
}

// Returns the keys of required dependencies that are NOT yet active.
export function missingDependencies(
  moduleKey: string,
  allModules: GlobalModule[],
  activeKeys: Set<string>
): string[] {
  const mod = allModules.find((m) => m.key === moduleKey);
  if (!mod) return [];
  return (mod.dependencies ?? [])
    .filter((d) => d.type === "required" && !activeKeys.has(d.module_key))
    .map((d) => d.module_key);
}
