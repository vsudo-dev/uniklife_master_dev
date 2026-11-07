import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import { useEntitlements } from "@/hooks/use-entitlements";
import { getNavForRole } from "@/lib/nav-config";
import { getHomeRoute } from "@/lib/portal-config";
import { logPortalBlock } from "@/lib/log-portal-block";
import { ShellLayout } from "./dashboard-shell";

export function CustomerPortalShell() {
  const { user, activeRole, activeTenantSlug, viewMode } = useAuthStore();
  const location = useLocation();
  const platformRole = user?.platform_role;

  const allowed =
    activeRole === "customer" ||
    (platformRole === "super_admin" && viewMode !== null);

  if (!allowed) {
    logPortalBlock(location.pathname, platformRole ?? "unknown");
    return <Navigate to={getHomeRoute(platformRole, activeRole, activeTenantSlug)} replace />;
  }

  return <CustomerPortalShellInner />;
}

function CustomerPortalShellInner() {
  const { user, activeTenantId, signOut } = useAuthStore();
  const { data: branding } = useBranding(activeTenantId ?? undefined);
  const { data: entitlements } = useEntitlements(activeTenantId ?? undefined);

  const activeModuleKeys = (entitlements ?? [])
    .filter((e) => e.status === "active")
    .map((e) => e.global_modules?.key)
    .filter((k): k is string => !!k);

  const navItems = getNavForRole("tenant_user", "customer", activeModuleKeys);

  return (
    <ShellLayout
      brandName={branding?.business_name ?? "UNIKLIFE.AI"}
      navItems={navItems}
      userName={user?.full_name ?? "User"}
      userDetail="Customer"
      onSignOut={signOut}
      gradientFrom={branding?.sidebar_gradient_from ?? undefined}
      gradientTo={branding?.sidebar_gradient_to ?? undefined}
    />
  );
}
