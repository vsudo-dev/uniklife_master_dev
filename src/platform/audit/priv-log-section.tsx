import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface PrivLogEntry {
  id: string;
  actor_id: string;
  actor_role: string;
  operation: string;
  tenant_id: string | null;
  record_type: string | null;
  record_id: string | null;
  reason: string;
  legal_ref: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

function usePrivilegedLogs(limit: number) {
  return useQuery({
    queryKey: ["privileged-logs", limit],
    queryFn: async (): Promise<PrivLogEntry[]> => {
      const { data, error } = await supabase
        .from("privileged_operation_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as PrivLogEntry[];
    },
  });
}

export function PrivilegedLogSection() {
  const { data: logs, isLoading } = usePrivilegedLogs(50);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="mt-10">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Privileged Operations
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Super Admin and elevated-privilege operations with full audit trail.
        </p>
      </div>

      {isLoading && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Loading...
        </div>
      )}

      {logs && logs.length === 0 && (
        <div className="mt-4 text-center text-sm text-gray-500">
          No privileged operations logged yet.
        </div>
      )}

      {logs && logs.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Operation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actor Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Reason
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {log.operation}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {log.actor_role}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {log.reason}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      onClick={() =>
                        setExpandedId(
                          expandedId === log.id ? null : log.id
                        )
                      }
                      className="text-xs text-royal-blue hover:text-royal-blue-light"
                    >
                      {expandedId === log.id ? "Hide" : "Details"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {expandedId && logs && (() => {
        const log = logs.find((l) => l.id === expandedId);
        if (!log) return null;
        return (
          <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs font-medium uppercase text-gray-500">
                  Record
                </span>
                <p className="text-gray-900">
                  {log.record_type ?? "—"}{" "}
                  {log.record_id ? log.record_id.slice(0, 8) + "..." : ""}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium uppercase text-gray-500">
                  Legal Ref
                </span>
                <p className="text-gray-900">{log.legal_ref ?? "—"}</p>
              </div>
            </div>
            <div className="mt-3">
              <span className="text-xs font-medium uppercase text-gray-500">
                Details
              </span>
              <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-700">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
