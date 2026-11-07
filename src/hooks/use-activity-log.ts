import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/use-auth";

export function useActivityLog() {
  const { isAuthenticated } = useAuthStore();

  const log = useCallback(async (
    action: string,
    entityType = "page",
    entityId?: string,
    details: Record<string, unknown> = {}
  ) => {
    if (!isAuthenticated) return;
    await supabase.rpc("log_user_activity", {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId ?? null,
      p_details: details,
    });
  }, [isAuthenticated]);

  return { log };
}

/** Drop-in hook — call at the top of any page component to log a page view once on mount. */
export function usePageView(page: string, details: Record<string, unknown> = {}) {
  const { log } = useActivityLog();
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    log("page.view", "page", undefined, { page, ...details });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
