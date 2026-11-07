import { supabase } from "@/lib/supabase";

export function logPortalBlock(attemptedRoute: string, userRole: string) {
  void supabase.rpc("log_user_activity", {
    p_action: "portal.access_blocked",
    p_entity_type: "portal_guard",
    p_entity_id: null,
    p_details: { attempted_route: attemptedRoute, user_role: userRole },
  });
}
