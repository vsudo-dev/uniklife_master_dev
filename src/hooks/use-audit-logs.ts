import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  actor_name: string | null;
  tenant_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AuditFilters {
  tab?: "all" | "system" | "user";
  actorRole?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useAuditLogs(limit = 100, filters: AuditFilters = {}) {
  return useQuery({
    queryKey: ["audit_logs", limit, filters],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      const SYSTEM_ACTIONS = ["INSERT", "UPDATE", "DELETE"];

      let query = supabase
        .from("audit_logs")
        .select("*, platform_users!actor_id(full_name)")
        .order("created_at", { ascending: false })
        .limit(limit);

      // Tab filter
      if (filters.tab === "system") {
        query = query.in("action", SYSTEM_ACTIONS);
      } else if (filters.tab === "user") {
        query = query.not("action", "in", "(INSERT,UPDATE,DELETE)");
      }

      if (filters.actorRole) query = query.eq("actor_role", filters.actorRole);
      if (filters.entityType) query = query.ilike("entity_type", `%${filters.entityType}%`);
      if (filters.dateFrom) query = query.gte("created_at", `${filters.dateFrom}T00:00:00`);
      if (filters.dateTo) query = query.lte("created_at", `${filters.dateTo}T23:59:59`);

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((row: Record<string, unknown>) => {
        // Supabase returns the joined row under the FK-hinted key
        const joined = (row["platform_users!actor_id"] ?? row.platform_users) as { full_name?: string } | null;
        return {
          ...(row as Omit<AuditLogEntry, "actor_name">),
          actor_name: joined?.full_name ?? null,
        };
      });
    },
    staleTime: 30_000,
  });
}
