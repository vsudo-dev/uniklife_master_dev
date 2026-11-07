import { useState } from "react";
import { Outlet, NavLink, Navigate } from "react-router-dom";
import { useAuthStore } from "@/hooks/use-auth";
import { LogOut, Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { PLATFORM_NAV } from "@/lib/nav-config";
import type { NavItem } from "@/lib/nav-config";

/* ── localStorage persistence ── */
const SIDEBAR_KEY = "uniklife-sidebar-collapsed";
function readCollapsed(): boolean {
  try { return localStorage.getItem(SIDEBAR_KEY) === "1"; } catch { return false; }
}
function writeCollapsed(v: boolean) {
  try { localStorage.setItem(SIDEBAR_KEY, v ? "1" : "0"); } catch { /* noop */ }
}

/* ── Avatar with gold gradient + initials ── */
function UserAvatar({ name, size }: { name: string; size: "sm" | "lg" }) {
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        "bg-gradient-to-br from-gold to-gold-dark ring-2 ring-white/20",
        size === "lg" ? "h-11 w-11 text-sm" : "h-8 w-8 text-[10px]"
      )}
    >
      {initials}
    </div>
  );
}

/* ── Floating tooltip (collapsed mode, desktop only) ── */
function NavTooltip({ label, visible }: { label: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-[60] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-xl ring-1 ring-white/10 transition-opacity duration-150 group-hover:opacity-100">
      {label}
    </span>
  );
}

/* ── DashboardShell — role guard + redirect ── */
export function DashboardShell() {
  const { user, activeRole, activeTenantId, activeTenantSlug, signOut } = useAuthStore();
  const platformRole = user?.platform_role;

  if (platformRole === "support_ops") {
    return <Navigate to="/support" replace />;
  }

  if (platformRole !== "super_admin") {
    if (activeRole === "customer") {
      return <Navigate to="/portal" replace />;
    }
    if (activeTenantId && activeTenantSlug) {
      return <Navigate to={`/t/${activeTenantSlug}/dashboard`} replace />;
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-sm w-full text-center rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-lg font-semibold text-gray-900 mb-2">Account not linked</p>
          <p className="text-sm text-gray-500 mb-4">
            Your account was created, but you have not been assigned to any organisation yet.
          </p>
          <p className="text-sm text-gray-500">
            Please contact your administrator to get access.
            Your email: <span className="font-medium text-gray-900">{user?.email}</span>
          </p>
          <button
            onClick={signOut}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <ShellLayout
      brandName="UNIKLIFE.AI"
      navItems={PLATFORM_NAV}
      userName={user?.full_name ?? "User"}
      userDetail={user?.platform_role ?? ""}
      onSignOut={signOut}
    />
  );
}

/* ── ShellLayout — shared smart sidebar ── */
export function ShellLayout({
  brandName,
  navItems,
  userName,
  userDetail,
  onSignOut,
  gradientFrom,
  gradientTo,
}: {
  brandName: string;
  navItems: NavItem[];
  userName: string;
  userDetail: string;
  onSignOut: () => void;
  gradientFrom?: string;
  gradientTo?: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    writeCollapsed(next);
  };

  const sidebarBg = gradientFrom
    ? { background: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo || gradientFrom})` }
    : undefined;

  return (
    <div className="relative flex min-h-screen">
      {/* ── Mobile backdrop (frosted) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar panel ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col text-white",
          "transition-all duration-300 ease-in-out",
          "lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          !gradientFrom && "bg-gradient-to-b from-sidebar-from to-sidebar-to",
          collapsed ? "lg:w-[72px]" : "lg:w-64",
          "w-64 shrink-0"
        )}
        style={sidebarBg}
      >
        {/* ─── Profile section ─── */}
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
            <UserAvatar name={userName} size={collapsed ? "sm" : "lg"} />

            <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50">
                {userDetail}
              </p>
              <p className="truncate text-sm font-bold tracking-tight">{userName}</p>
            </div>

            {/* Collapse / expand toggle — desktop only */}
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

            {/* Close — mobile only */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="shrink-0 rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ─── Section label ─── */}
        <div
          className={cn(
            "pt-6 pb-2",
            collapsed ? "lg:px-0 lg:text-center" : "px-5"
          )}
        >
          <p className={cn(
            "text-[10px] font-bold uppercase tracking-[0.2em] text-white/30",
            collapsed && "lg:hidden"
          )}>
            Main
          </p>
          {/* Dot indicator for collapsed mode */}
          <div className={cn(
            "hidden",
            collapsed && "lg:flex lg:justify-center"
          )}>
            <span className="h-1 w-5 rounded-full bg-white/20" />
          </div>
        </div>

        {/* ─── Navigation ─── */}
        <nav
          className={cn(
            "flex-1 space-y-1 overflow-y-auto",
            collapsed ? "lg:px-2" : "px-3"
          )}
        >
          {navItems.map(({ label, icon: Icon, href }) => (
            <NavLink
              key={href}
              to={href}
              end={href === "/" || href.endsWith("/dashboard") || href === "/portal"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center rounded-xl text-sm transition-all duration-150",
                  collapsed
                    ? "lg:justify-center lg:px-0 lg:py-3"
                    : "",
                  "gap-3 px-3 py-2.5",
                  isActive
                    ? "bg-white/15 font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                    : "font-medium text-white/60 hover:bg-white/10 hover:text-white"
                )
              }
            >
              <Icon
                className={cn(
                  "shrink-0 transition-all duration-150",
                  collapsed ? "h-5 w-5" : "h-[18px] w-[18px]"
                )}
              />
              <span className={cn("truncate", collapsed && "lg:hidden")}>
                {label}
              </span>
              <NavTooltip label={label} visible={collapsed} />
            </NavLink>
          ))}
        </nav>

        {/* ─── Footer — sign out ─── */}
        <div
          className={cn(
            "border-t border-white/10",
            collapsed ? "lg:p-2" : "p-3"
          )}
        >
          <button
            onClick={onSignOut}
            className={cn(
              "group relative flex w-full items-center rounded-xl text-sm font-medium transition-colors",
              "text-white/50 hover:bg-white/10 hover:text-white",
              collapsed
                ? "lg:justify-center lg:px-0 lg:py-3"
                : "",
              "gap-3 px-3 py-2.5"
            )}
            title="Sign out"
          >
            <LogOut
              className={cn(
                "shrink-0",
                collapsed ? "h-5 w-5" : "h-[18px] w-[18px]"
              )}
            />
            <span className={cn("truncate", collapsed && "lg:hidden")}>
              Sign out
            </span>
            <NavTooltip label="Sign out" visible={collapsed} />
          </button>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="shrink-0 rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="truncate text-sm font-semibold text-gray-900">
            {brandName}
          </span>
        </header>

        <main className="flex-1 overflow-x-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
