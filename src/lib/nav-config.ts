import type { PlatformRole, TenantRole } from "@/types";
import {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  ScrollText,
  Globe,
  Boxes,
  UserCircle,
  Calendar,
  FileText,
  Heart,
  Activity,
  ClipboardList,
  Settings,
  Receipt,
  Stethoscope,
  BarChart3,
  GitBranch,
  Link2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
  moduleKey?: string;
  children?: NavItem[];
}

export const PLATFORM_NAV: NavItem[] = [
  { label: "Dashboard",    icon: LayoutDashboard, href: "/" },
  { label: "Tenants",      icon: Building2,       href: "/tenants" },
  { label: "Portal Links", icon: Link2,           href: "/portal-links" },
  { label: "Support Team", icon: Users,           href: "/users" },
  { label: "Industries",   icon: Globe,           href: "/industries" },
  { label: "Modules",      icon: Boxes,           href: "/modules" },
  { label: "Delegation",   icon: Shield,          href: "/delegation" },
  { label: "Audit Log",    icon: ScrollText,      href: "/audit" },
];

function tenantNav(slug: string): {
  admin: NavItem[];
  practitioner: NavItem[];
  staff: NavItem[];
} {
  const t = (path: string) => `/t/${slug}/${path}`;
  return {
    admin: [
      { label: "Dashboard", icon: LayoutDashboard, href: t("dashboard") },
      { label: "Workspace", icon: Stethoscope, href: t("workspace") },
      { label: "Clients", icon: UserCircle, href: t("clients"), moduleKey: "C01" },
      { label: "Appointments", icon: Calendar, href: t("appointments"), moduleKey: "C02" },
      { label: "Documents", icon: FileText, href: t("documents"), moduleKey: "C03" },
      { label: "Programs", icon: ClipboardList, href: t("programs"), moduleKey: "W10" },
      { label: "Health", icon: Heart, href: t("health"), moduleKey: "W03" },
      { label: "Progress", icon: Activity, href: t("progress"), moduleKey: "W04" },
      { label: "Billing", icon: Receipt, href: t("billing"), moduleKey: "C04" },
      { label: "Members", icon: Users, href: t("members") },
      { label: "Branches", icon: GitBranch, href: t("branches") },
      { label: "Reports", icon: BarChart3, href: t("reports") },
      { label: "Settings", icon: Settings, href: t("settings") },
    ],
    practitioner: [
      { label: "Workspace", icon: Stethoscope, href: t("workspace") },
      { label: "My Clients", icon: UserCircle, href: t("clients"), moduleKey: "C01" },
      { label: "Appointments", icon: Calendar, href: t("appointments"), moduleKey: "C02" },
      { label: "Health", icon: Heart, href: t("health"), moduleKey: "W03" },
      { label: "Progress", icon: Activity, href: t("progress"), moduleKey: "W04" },
      { label: "Programs", icon: ClipboardList, href: t("programs"), moduleKey: "W10" },
    ],
    staff: [
      { label: "Dashboard", icon: LayoutDashboard, href: t("dashboard") },
      { label: "Clients", icon: UserCircle, href: t("clients"), moduleKey: "C01" },
      { label: "Appointments", icon: Calendar, href: t("appointments"), moduleKey: "C02" },
      { label: "Documents", icon: FileText, href: t("documents"), moduleKey: "C03" },
      { label: "Billing", icon: Receipt, href: t("billing"), moduleKey: "C04" },
    ],
  };
}

const CUSTOMER_NAV: NavItem[] = [
  { label: "Home", icon: LayoutDashboard, href: "/portal" },
  { label: "Appointments", icon: Calendar, href: "/portal/appointments", moduleKey: "C02" },
  { label: "My Health", icon: Heart, href: "/portal/health", moduleKey: "W03" },
  { label: "Progress", icon: Activity, href: "/portal/progress", moduleKey: "W04" },
  { label: "Documents", icon: FileText, href: "/portal/documents", moduleKey: "C03" },
];

export function getNavForRole(
  platformRole: PlatformRole,
  tenantRole: TenantRole | null,
  activeModuleKeys: string[],
  context: "platform" | "tenant" = "platform",
  slug = ""
): NavItem[] {
  // Inside the tenant shell, always use tenant role nav — even for super_admin
  if (context === "tenant") {
    const nav = tenantNav(slug);
    let roleNav: NavItem[];
    if (tenantRole === "tenant_admin") roleNav = nav.admin;
    else if (tenantRole === "practitioner") roleNav = nav.practitioner;
    else if (tenantRole === "customer") roleNav = CUSTOMER_NAV;
    else roleNav = nav.staff;
    return roleNav.filter(
      (item) => !item.moduleKey || activeModuleKeys.includes(item.moduleKey)
    );
  }

  if (platformRole === "super_admin" || platformRole === "support_ops") {
    return PLATFORM_NAV;
  }

  if (!tenantRole) return [];

  const nav = tenantNav(slug);
  let roleNav: NavItem[];
  if (tenantRole === "tenant_admin") roleNav = nav.admin;
  else if (tenantRole === "practitioner") roleNav = nav.practitioner;
  else if (tenantRole === "customer") roleNav = CUSTOMER_NAV;
  else roleNav = nav.staff;

  return roleNav.filter(
    (item) => !item.moduleKey || activeModuleKeys.includes(item.moduleKey)
  );
}
