import type { PlatformRole, TenantRole } from "@/types";

export type PortalZone = "platform" | "support" | "tenant" | "portal";

export interface PortalDef {
  zone: PortalZone;
  allowedPlatformRoles: PlatformRole[];
  allowedTenantRoles?: TenantRole[];
  pathPrefix: string;
  label: string;
  loginPath: string;
}

export const PORTALS: Record<PortalZone, PortalDef> = {
  platform: {
    zone: "platform",
    allowedPlatformRoles: ["super_admin"],
    pathPrefix: "/",
    label: "Platform Admin",
    loginPath: "/auth/login",
  },
  support: {
    zone: "support",
    allowedPlatformRoles: ["support_ops"],
    pathPrefix: "/support",
    label: "Support Ops",
    loginPath: "/auth/login",
  },
  tenant: {
    zone: "tenant",
    allowedPlatformRoles: ["super_admin", "support_ops"],
    allowedTenantRoles: ["tenant_admin", "practitioner", "staff"],
    pathPrefix: "/t/",
    label: "Tenant",
    loginPath: "/login",
  },
  portal: {
    zone: "portal",
    allowedPlatformRoles: ["super_admin"],
    allowedTenantRoles: ["customer"],
    pathPrefix: "/portal",
    label: "Customer Portal",
    loginPath: "/portal",
  },
};

export function isAllowedInZone(
  zone: PortalZone,
  platformRole: PlatformRole | undefined | null,
  tenantRole: TenantRole | null,
  viewMode: boolean
): boolean {
  const def = PORTALS[zone];

  if (viewMode && platformRole === "super_admin") return true;

  if (platformRole && def.allowedPlatformRoles.includes(platformRole)) return true;

  if (tenantRole && def.allowedTenantRoles?.includes(tenantRole)) return true;

  return false;
}

export function getHomeRoute(
  platformRole: PlatformRole | undefined | null,
  tenantRole: TenantRole | null,
  tenantSlug?: string | null
): string {
  if (platformRole === "super_admin") return "/";
  if (platformRole === "support_ops") return "/support";
  if (tenantRole === "customer") return "/portal";
  if (tenantSlug) return `/t/${tenantSlug}/dashboard`;
  return "/";
}
