import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { usePageView } from "@/hooks/use-activity-log";

const STATUS_COLORS: Record<string, string> = {
  paid:      "bg-green-100 text-green-800",
  sent:      "bg-blue-100 text-blue-800",
  overdue:   "bg-red-100 text-red-800",
  partial:   "bg-yellow-100 text-yellow-800",
  draft:     "bg-gray-100 text-gray-700",
  cancelled: "bg-gray-100 text-gray-500",
};

function statusColor(s: string) {
  return STATUS_COLORS[s] ?? "bg-gray-100 text-gray-700";
}

function fmtCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${highlight ? "text-red-600" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}

export function BillingPage({ tenantId }: { tenantId: string }) {
  usePageView("billing");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ["crm_invoices", tenantId, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("crm_invoices")
        .select("id, invoice_number, amount, currency, status, due_date, paid_at, created_at, crm_contact_id")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const filtered = (invoices ?? []).filter((inv) => {
    if (!search) return true;
    return inv.invoice_number?.toLowerCase().includes(search.toLowerCase());
  });

  // Revenue summary computed from fetched data
  const all = invoices ?? [];
  const revenue = {
    total: all.reduce((s, r) => s + (r.amount ?? 0), 0),
    paid: all.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0),
    outstanding: all.filter((r) => ["sent", "partial"].includes(r.status)).reduce((s, r) => s + r.amount, 0),
    overdue: all.filter((r) => r.status === "overdue").reduce((s, r) => s + r.amount, 0),
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Billing</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {invoices?.length ?? 0} invoices · synced from CRM
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Invoiced" value={fmtCurrency(revenue.total)} />
        <StatCard label="Collected" value={fmtCurrency(revenue.paid)} />
        <StatCard label="Outstanding" value={fmtCurrency(revenue.outstanding)} highlight={revenue.outstanding > 0} />
        <StatCard label="Overdue" value={fmtCurrency(revenue.overdue)} highlight={revenue.overdue > 0} />
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search invoice number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-royal-blue focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-royal-blue focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">Could not load invoices.</p>
          <p className="mt-1 font-mono text-xs opacity-80">{(error as Error).message}</p>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading invoices...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
          <p className="text-sm text-gray-500">
            {search || statusFilter !== "all"
              ? "No invoices match your filters."
              : "No invoices yet. Create an invoice in the CRM to sync it here."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Invoice #", "Date", "Due Date", "Amount", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-royal-blue">
                    {inv.invoice_number ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(inv.created_at).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    {fmtCurrency(inv.amount, inv.currency ?? "INR")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColor(inv.status)}`}>
                      {inv.status}
                    </span>
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
