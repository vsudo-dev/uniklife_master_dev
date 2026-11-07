import { useParams, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import { useEntitlements } from "@/hooks/use-entitlements";
import { useTenantBySlug } from "@/hooks/use-tenant-by-slug";
import { getNavForRole } from "@/lib/nav-config";
import { logPortalBlock } from "@/lib/log-portal-block";
import { TenantContextProvider } from "@/contexts/tenant-context";
import { ShellLayout } from "./dashboard-shell";
import { LoadingScreen } from "./loading-screen";

export function TenantShell() {
  const { activeRole } = useAuthStore();
  const location = useLocation();

  if (activeRole === "customer") {
    logPortalBlock(location.pathname, "customer");
    return <Navigate to="/portal" replace />;
  }

  return <TenantShellInner />;
}

function TenantShellInner() {
  const { slug } = useParams<{ slug: string }>();
  const { user, activeRole, memberships } = useAuthStore();

  const { data: tenant, isLoading: tenantLoading } = useTenantBySlug(slug);
  const tenantId = tenant?.id;

  const { data: branding } = useBranding(tenantId);
  const { data: entitlements } = useEntitlements(tenantId);

  if (tenantLoading) return <LoadingScreen />;

  if (!tenant || !tenantId) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Tenant not found: <strong>{slug}</strong>
      </div>
    );
  }

  const hasMembership =
    user?.platform_role === "super_admin" ||
    user?.platform_role === "support_ops" ||
    memberships.some((m) => m.tenant_id === tenantId && m.status === "active");

  if (!hasMembership) {
    return <Navigate to="/" replace />;
  }

  const activeModuleKeys = (entitlements ?? [])
    .filter((e) => e.status === "active")
    .map((e) => e.global_modules?.key)
    .filter((k): k is string => !!k);

  const tenantRole =
    user?.platform_role === "super_admin" || user?.platform_role === "support_ops"
      ? (memberships.find((m) => m.tenant_id === tenantId && m.status === "active")
          ?.role ?? activeRole ?? "tenant_admin")
      : activeRole;

  const navItems = getNavForRole(
    user?.platform_role ?? "tenant_user",
    tenantRole,
    activeModuleKeys,
    "tenant",
    slug!
  );

  return (
    <TenantContextProvider value={{ tenantId, slug: slug! }}>
      <ShellLayout
        brandName={branding?.business_name ?? tenant.name ?? "UNIKLIFE.AI"}
        navItems={navItems}
        userName={user?.full_name ?? "User"}
        userDetail={tenantRole ?? ""}
        onSignOut={useAuthStore.getState().signOut}
        gradientFrom={branding?.sidebar_gradient_from ?? undefined}
        gradientTo={branding?.sidebar_gradient_to ?? undefined}
      />
    </TenantContextProvider>
  );
}
