import { useState } from "react";
import { useModules } from "@/hooks/use-modules";
import { cn } from "@/lib/cn";
import type { GlobalModule, ModuleLayer } from "@/types";

const LAYER_LABELS: Record<ModuleLayer, string> = {
  platform: "Platform",
  core: "Core",
  vertical: "Vertical",
  addon: "Add-on",
};

const LAYER_STYLES: Record<ModuleLayer, string> = {
  platform: "bg-purple-50 text-purple-700 border-purple-200",
  core: "bg-blue-50 text-blue-700 border-blue-200",
  vertical: "bg-green-50 text-green-700 border-green-200",
  addon: "bg-orange-50 text-orange-700 border-orange-200",
};

const STATUS_STYLES: Record<string, string> = {
  stable: "bg-green-50 text-green-700",
  beta: "bg-yellow-50 text-yellow-700",
  draft: "bg-gray-100 text-gray-600",
  deprecated: "bg-red-50 text-red-700",
  removed: "bg-red-100 text-red-800",
};

export function ModulesPage() {
  const { data: modules, isLoading, error } = useModules();
  const [filterLayer, setFilterLayer] = useState<ModuleLayer | "all">("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = modules?.filter((m) => {
    if (filterLayer !== "all" && m.layer !== filterLayer) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.key.toLowerCase().includes(q) ||
        m.display_name.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = modules?.reduce(
    (acc, m) => {
      acc[m.layer] = (acc[m.layer] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Module Registry</h2>
        <p className="mt-1 text-sm text-gray-500">
          {modules?.length ?? 0} modules across {Object.keys(counts ?? {}).length} layers.
        </p>
      </div>

      {/* Filter bar */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {(["all", "platform", "core", "vertical", "addon"] as const).map((layer) => (
            <button
              key={layer}
              onClick={() => setFilterLayer(layer)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                filterLayer === layer
                  ? "bg-royal-blue text-white"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {layer === "all" ? "All" : LAYER_LABELS[layer]}
              {layer !== "all" && counts?.[layer] ? ` (${counts[layer]})` : ""}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search modules..."
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        />
      </div>

      {isLoading && (
        <div className="mt-8 text-center text-sm text-gray-500">Loading modules...</div>
      )}

      {error && (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {(error as Error).message}
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <div className="mt-6 space-y-2">
          {filtered.map((mod) => (
            <ModuleRow
              key={mod.id}
              module={mod}
              allModules={modules!}
              isExpanded={expanded === mod.id}
              onToggle={() => setExpanded(expanded === mod.id ? null : mod.id)}
            />
          ))}
        </div>
      )}

      {filtered && filtered.length === 0 && (
        <div className="mt-12 text-center text-sm text-gray-500">No modules match your filter.</div>
      )}
    </div>
  );
}

function ModuleRow({
  module: mod,
  allModules,
  isExpanded,
  onToggle,
}: {
  module: GlobalModule;
  allModules: GlobalModule[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const deps = (mod.dependencies ?? []) as { module_key: string; type: string; min_version: string }[];

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-5 py-3 text-left"
      >
        <span className="w-14 shrink-0 font-mono text-sm font-bold text-gray-900">{mod.key}</span>
        <span className="flex-1 text-sm font-medium text-gray-800">{mod.display_name}</span>
        <span
          className={cn(
            "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
            LAYER_STYLES[mod.layer]
          )}
        >
          {LAYER_LABELS[mod.layer]}
        </span>
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
            STATUS_STYLES[mod.lifecycle_status] ?? "bg-gray-100 text-gray-600"
          )}
        >
          {mod.lifecycle_status}
        </span>
        {mod.industry_keys.length > 0 && (
          <span className="text-xs text-gray-400">{mod.industry_keys.join(", ")}</span>
        )}
        <svg
          className={cn("h-4 w-4 text-gray-400 transition-transform", isExpanded && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100 px-5 py-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Description</p>
              <p className="mt-1 text-gray-700">{mod.description || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Version</p>
              <p className="mt-1 text-gray-700">{mod.version}</p>
            </div>
          </div>

          {deps.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase text-gray-500">Dependencies</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {deps.map((dep) => {
                  const target = allModules.find((m) => m.key === dep.module_key);
                  return (
                    <span
                      key={dep.module_key}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                        dep.type === "required"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : dep.type === "optional"
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : "border-gray-200 bg-gray-50 text-gray-600"
                      )}
                    >
                      <span className="font-mono font-bold">{dep.module_key}</span>
                      <span>{target?.display_name ?? "?"}</span>
                      <span className="text-[10px] opacity-70">({dep.type})</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {Object.keys(mod.feature_flags).length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase text-gray-500">Feature Flags</p>
              <pre className="mt-1 max-h-32 overflow-auto rounded bg-gray-50 p-2 text-xs text-gray-700">
                {JSON.stringify(mod.feature_flags, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
