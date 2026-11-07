import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Building2, Users, GitBranch, ScrollText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePageView } from "@/hooks/use-activity-log";

interface DashboardStats {
  tenants: number;
  branches: number;
  members: number;
  auditEntries: number;
}

function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const [tenants, branches, members, audit] = await Promise.all([
        supabase.from("tenants").select("id", { count: "exact", head: true }),
        supabase.from("branches").select("id", { count: "exact", head: true }),
        supabase
          .from("tenant_memberships")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("audit_logs")
          .select("id", { count: "exact", head: true }),
      ]);

      return {
        tenants: tenants.count ?? 0,
        branches: branches.count ?? 0,
        members: members.count ?? 0,
        auditEntries: audit.count ?? 0,
      };
    },
  });
}

const STAT_CARDS = [
  { key: "tenants" as const, label: "Tenants", icon: Building2, href: "/tenants" },
  { key: "branches" as const, label: "Branches", icon: GitBranch, href: "/tenants" },
  { key: "members" as const, label: "Active Members", icon: Users, href: "/users" },
  { key: "auditEntries" as const, label: "Audit Entries", icon: ScrollText, href: "/audit" },
];

export function DashboardPage() {
  usePageView("platform.dashboard");
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <div className="p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500">
          Platform overview — Phase 1 Foundation
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, href }) => (
          <Link
            key={key}
            to={href}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">{label}</p>
              <Icon className="h-5 w-5 text-gray-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {isLoading ? "—" : stats?.[key] ?? 0}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
