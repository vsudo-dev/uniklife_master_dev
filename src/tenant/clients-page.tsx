import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePageView } from "@/hooks/use-activity-log";
import { useAuthStore } from "@/hooks/use-auth";

function initials(first: string | null, last?: string | null) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

export function ClientsPage({ tenantId }: { tenantId: string }) {
  usePageView("clients");
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { user, viewMode, enterViewMode, activeTenantSlug } = useAuthStore();
  const isSuperAdmin = user?.platform_role === "super_admin";
  const tenantName = viewMode?.tenantName ?? "";
  const slug = viewMode?.slug ?? activeTenantSlug ?? "";

  function handleViewAsCustomer(e: React.MouseEvent, contactId: string) {
    e.stopPropagation();
    enterViewMode({ tenantId, slug, tenantName, role: "customer", contactId, returnPath: window.location.pathname });
    navigate("/portal");
  }

  const { data: contacts, isLoading, error } = useQuery({
    queryKey: ["contacts", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, first_name, last_name, email, phone, city, state, source, created_at")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const filtered = (contacts ?? []).filter((c) => {
    const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.toLowerCase();
    const email = c.email?.toLowerCase() ?? "";
    const phone = c.phone ?? "";
    const q = search.toLowerCase();
    return name.includes(q) || email.includes(q) || phone.includes(q);
  });

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Clients</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {contacts?.length ?? 0} contacts · synced from CRM
          </p>
        </div>
      </div>

      <input
        type="search"
        placeholder="Search by name, email or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-royal-blue focus:outline-none"
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">Could not load contacts.</p>
          <p className="mt-1 font-mono text-xs opacity-80">{(error as Error).message}</p>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading contacts...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
          <p className="text-sm text-gray-500">
            {search ? "No contacts match your search." : "No contacts yet. Create a contact in the CRM to sync it here."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 pl-4 pr-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Client</th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Contact</th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Location</th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Added</th>
                <th className="relative py-3 pl-3 pr-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(c.id)}
                >
                  <td className="py-3 pl-4 pr-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-royal-blue text-xs font-semibold text-white">
                        {initials(c.first_name, c.last_name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {c.first_name} {c.last_name}
                        </p>
                        {c.source === "crm" && (
                          <p className="text-xs text-gray-400">CRM</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-sm text-gray-700">{c.email ?? "—"}</p>
                    <p className="text-xs text-gray-500">{c.phone ?? ""}</p>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-500">
                    {[c.city, c.state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-500">
                    {new Date(c.created_at).toLocaleDateString("en-IN")}
                  </td>
                  <td className="py-3 pl-3 pr-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isSuperAdmin && (
                        <button
                          type="button"
                          title="View as this customer"
                          onClick={(e) => handleViewAsCustomer(e, c.id)}
                          className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-400 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <span className="text-xs text-royal-blue hover:underline">View →</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
