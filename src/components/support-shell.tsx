import { useState } from "react";
import { Outlet, NavLink, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/hooks/use-auth";
import { getHomeRoute } from "@/lib/portal-config";
import { logPortalBlock } from "@/lib/log-portal-block";
import {
  LogOut,
  Shield,
  ClipboardList,
  LayoutDashboard,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/cn";

const SUPPORT_NAV = [
  { label: "Overview", icon: LayoutDashboard, href: "/support" },
  { label: "Delegations", icon: Shield, href: "/support/delegations" },
  { label: "Action Requests", icon: ClipboardList, href: "/support/requests" },
];

const SIDEBAR_KEY = "uniklife-sidebar-collapsed";
function readCollapsed(): boolean {
  try { return localStorage.getItem(SIDEBAR_KEY) === "1"; } catch { return false; }
}
function writeCollapsed(v: boolean) {
  try { localStorage.setItem(SIDEBAR_KEY, v ? "1" : "0"); } catch { /* noop */ }
}

function NavTooltip({ label, visible }: { label: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-[60] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-xl ring-1 ring-white/10 transition-opacity duration-150 group-hover:opacity-100">
      {label}
    </span>
  );
}

export function SupportShell() {
  const { user, activeRole, activeTenantSlug } = useAuthStore();
  const location = useLocation();
  const platformRole = user?.platform_role;

  if (platformRole !== "support_ops") {
    logPortalBlock(location.pathname, platformRole ?? "unknown");
    return <Navigate to={getHomeRoute(platformRole, activeRole, activeTenantSlug)} replace />;
  }

  return <SupportShellInner />;
}

function SupportShellInner() {
  const { user, signOut } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    writeCollapsed(next);
  };

  const initials = (user?.full_name ?? "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative flex min-h-screen">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col text-white",
          "bg-gradient-to-b from-slate-800 to-slate-900",
          "transition-all duration-300 ease-in-out",
          "lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "lg:w-[72px]" : "lg:w-64",
          "w-64 shrink-0"
        )}
      >
        {/* Profile */}
        <div
          className={cn(
            "relative border-b border-white/10",
            collapsed
              ? "lg:flex lg:flex-col lg:items-center lg:gap-2 lg:px-3 lg:py-5"
              : "px-5 py-5"
          )}
        >
          <div className={cn(
            "flex items-center",
            collapsed ? "lg:flex-col lg:gap-2" : "gap-3"
          )}>
            <div
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full font-bold text-blue-300",
                "bg-blue-500/20 ring-2 ring-blue-400/20",
                collapsed ? "h-8 w-8 text-[10px]" : "h-11 w-11 text-sm"
              )}
            >
              {initials}
            </div>

            <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50">
                Support Ops
              </p>
              <p className="truncate text-sm font-bold tracking-tight">
                {user?.full_name ?? "User"}
              </p>
            </div>

            <button
              onClick={toggleCollapsed}
              className={cn(
                "hidden shrink-0 items-center justify-center rounded-full transition-colors lg:flex",
                "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white",
                collapsed ? "h-7 w-7" : "h-6 w-6"
              )}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed
                ? <ChevronRight className="h-3.5 w-3.5" />
                : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>

            <button
              onClick={() => setSidebarOpen(false)}
              className="shrink-0 rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Section label */}
        <div className={cn("pt-6 pb-2", collapsed ? "lg:px-0 lg:text-center" : "px-5")}>
          <p className={cn(
            "text-[10px] font-bold uppercase tracking-[0.2em] text-white/30",
            collapsed && "lg:hidden"
          )}>
            Main
          </p>
          <div className={cn("hidden", collapsed && "lg:flex lg:justify-center")}>
            <span className="h-1 w-5 rounded-full bg-white/20" />
          </div>
        </div>

        {/* Nav */}
        <nav className={cn(
          "flex-1 space-y-1 overflow-y-auto",
          collapsed ? "lg:px-2" : "px-3"
        )}>
          {SUPPORT_NAV.map(({ label, icon: Icon, href }) => (
            <NavLink
              key={href}
              to={href}
              end={href === "/support"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center rounded-xl text-sm transition-all duration-150",
                  collapsed ? "lg:justify-center lg:px-0 lg:py-3" : "",
                  "gap-3 px-3 py-2.5",
                  isActive
                    ? "bg-white/15 font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                    : "font-medium text-white/60 hover:bg-white/10 hover:text-white"
                )
              }
            >
              <Icon className={cn("shrink-0 transition-all duration-150", collapsed ? "h-5 w-5" : "h-[18px] w-[18px]")} />
              <span className={cn("truncate", collapsed && "lg:hidden")}>{label}</span>
              <NavTooltip label={label} visible={collapsed} />
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className={cn("border-t border-white/10", collapsed ? "lg:p-2" : "p-3")}>
          <button
            onClick={signOut}
            className={cn(
              "group relative flex w-full items-center rounded-xl text-sm font-medium transition-colors",
              "text-white/50 hover:bg-white/10 hover:text-white",
              collapsed ? "lg:justify-center lg:px-0 lg:py-3" : "",
              "gap-3 px-3 py-2.5"
            )}
            title="Sign out"
          >
            <LogOut className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-[18px] w-[18px]")} />
            <span className={cn("truncate", collapsed && "lg:hidden")}>Sign out</span>
            <NavTooltip label="Sign out" visible={collapsed} />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="shrink-0 rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Shield className="h-4 w-4 text-slate-600" />
          <span className="text-sm font-semibold text-gray-900">Support Ops</span>
        </header>

        <main className="flex-1 overflow-x-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
