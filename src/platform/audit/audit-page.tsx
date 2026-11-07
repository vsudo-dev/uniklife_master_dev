import { useState } from "react";
import { useAuditLogs, type AuditFilters } from "@/hooks/use-audit-logs";
import { PrivilegedLogSection } from "./priv-log-section";
import { cn } from "@/lib/cn";
import { ChevronDown, ChevronRight } from "lucide-react";

type Tab = "all" | "system" | "user";

const ACTION_STYLES: Record<string, string> = {
  INSERT:    "bg-green-50 text-green-700 border border-green-200",
  UPDATE:    "bg-blue-50 text-blue-700 border border-blue-200",
  DELETE:    "bg-red-50 text-red-700 border border-red-200",
  "page.view": "bg-purple-50 text-purple-700 border border-purple-200",
};

function actionStyle(action: string) {
  return ACTION_STYLES[action] ?? "bg-gray-100 text-gray-600 border border-gray-200";
}

const TABS: { key: Tab; label: string; desc: string }[] = [
  { key: "all",    label: "All Activity",    desc: "Every event — system and user" },
  { key: "system", label: "System Events",   desc: "DB writes: INSERT / UPDATE / DELETE" },
  { key: "user",   label: "User Activity",   desc: "Page views and frontend interactions" },
];

const ROLES = ["", "super_admin", "support_ops", "tenant_admin", "practitioner", "staff", "customer"];

export function AuditPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [actorRole, setActorRole] = useState("");
  const [entityType, setEntityType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filters: AuditFilters = {
    tab,
    actorRole: actorRole || undefined,
    entityType: entityType || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data: logs, isLoading, error } = useAuditLogs(200, filters);

  function resetFilters() {
    setActorRole("");
    setEntityType("");
    setDateFrom("");
    setDateTo("");
  }

  const hasFilters = !!(actorRole || entityType || dateFrom || dateTo);

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Audit Log</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Full record of system events and user activity — auto-purged after 90 days.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            title={t.desc}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-white text-royal-blue shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
          <select
            value={actorRole}
            onChange={(e) => setActorRole(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-royal-blue focus:outline-none"
          >
            <option value="">All roles</option>
            {ROLES.filter(Boolean).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Entity / Table</label>
          <input
            type="text"
            placeholder="e.g. tenant, page"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="w-40 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-royal-blue focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-royal-blue focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-royal-blue focus:outline-none"
          />
        </div>

        {hasFilters && (
          <button
            onClick={resetFilters}
            className="text-sm text-gray-500 hover:text-red-600 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Count */}
      {logs && (
        <p className="mb-3 text-xs text-gray-400">
          {logs.length} {logs.length === 200 ? "(showing latest 200)" : "entries"}
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load audit logs: {(error as Error).message}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <p className="text-sm text-gray-500">Loading audit logs...</p>
      )}

      {/* Empty */}
      {!isLoading && logs?.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
          <p className="text-sm text-gray-500">No entries match your filters.</p>
        </div>
      )}

      {/* Table */}
      {logs && logs.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-6 px-3 py-3" />
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Operation</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Entity / Table</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Record ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => {
                const isOpen = expandedId === log.id;
                return (
                  <>
                    <tr
                      key={log.id}
                      onClick={() => setExpandedId(isOpen ? null : log.id)}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-3 py-3 text-gray-400">
                        {isOpen
                          ? <ChevronDown className="h-3.5 w-3.5" />
                          : <ChevronRight className="h-3.5 w-3.5" />}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {log.actor_name ?? <span className="text-gray-400 italic">system</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {log.actor_role && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            {log.actor_role}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", actionStyle(log.action))}>
                          {log.action}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{log.entity_type}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-400">
                        {log.entity_id ? `${log.entity_id.slice(0, 8)}…` : "—"}
                      </td>
                    </tr>

                    {isOpen && (
                      <tr key={`${log.id}-detail`} className="bg-gray-50">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div>
                              <p className="mb-1 text-xs font-semibold uppercase text-gray-400">Actor ID</p>
                              <p className="font-mono text-xs text-gray-600 break-all">{log.actor_id ?? "—"}</p>
                            </div>
                            <div>
                              <p className="mb-1 text-xs font-semibold uppercase text-gray-400">Record ID</p>
                              <p className="font-mono text-xs text-gray-600 break-all">{log.entity_id ?? "—"}</p>
                            </div>
                            <div>
                              <p className="mb-1 text-xs font-semibold uppercase text-gray-400">Tenant ID</p>
                              <p className="font-mono text-xs text-gray-600 break-all">{log.tenant_id ?? "—"}</p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <p className="mb-1 text-xs font-semibold uppercase text-gray-400">Details</p>
                            <pre className="max-h-48 overflow-auto rounded-lg bg-white border border-gray-200 p-3 text-xs text-gray-700">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8">
        <PrivilegedLogSection />
      </div>
    </div>
  );
}
