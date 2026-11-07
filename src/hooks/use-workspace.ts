import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { WorkspaceAppointment } from "@/types";

export function useTodayAppointments(tenantId: string, staffUserId: string) {
  return useQuery({
    queryKey: ["today-appointments", tenantId, staffUserId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const start = `${today}T00:00:00`;
      const end = `${today}T23:59:59`;

      const { data, error } = await supabase
        .from("appointments")
        .select("*, contacts(first_name, last_name, email, phone), services(name, duration_minutes)")
        .eq("tenant_id", tenantId)
        .eq("staff_user_id", staffUserId)
        .gte("scheduled_at", start)
        .lte("scheduled_at", end)
        .not("status", "in", '("cancelled","rescheduled")')
        .order("scheduled_at");

      if (error) throw error;
      return data as WorkspaceAppointment[];
    },
    enabled: !!tenantId && !!staffUserId,
    refetchInterval: 60_000,
  });
}

export function useAllTodayAppointments(tenantId: string) {
  return useQuery({
    queryKey: ["all-today-appointments", tenantId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const start = `${today}T00:00:00`;
      const end = `${today}T23:59:59`;

      const { data, error } = await supabase
        .from("appointments")
        .select("*, contacts(first_name, last_name, email, phone), services(name, duration_minutes)")
        .eq("tenant_id", tenantId)
        .gte("scheduled_at", start)
        .lte("scheduled_at", end)
        .not("status", "in", '("cancelled","rescheduled")')
        .order("scheduled_at");

      if (error) throw error;
      return data as WorkspaceAppointment[];
    },
    enabled: !!tenantId,
    refetchInterval: 60_000,
  });
}
