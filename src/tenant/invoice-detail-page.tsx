import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useInvoice, useUpdateInvoiceStatus } from "@/hooks/use-invoices";
import { usePayments, useRecordPayment } from "@/hooks/use-payments";
import { useAuth } from "@/hooks/use-auth";
import type { PaymentMethod, Invoice } from "@/types";

function fmtCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

function statusColor(status: Invoice["status"]) {
  switch (status) {
    case "paid":     return "bg-green-100 text-green-800";
    case "sent":     return "bg-blue-100 text-blue-800";
    case "overdue":  return "bg-red-100 text-red-800";
    case "partial":  return "bg-yellow-100 text-yellow-800";
    default:         return "bg-gray-100 text-gray-700";
  }
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash", card: "Card", upi: "UPI",
  bank_transfer: "Bank Transfer", cheque: "Cheque", other: "Other",
};

export function InvoiceDetailPage({ tenantId }: { tenantId: string }) {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const { data: invoice, isLoading } = useInvoice(invoiceId!);
  const { data: payments } = usePayments(invoiceId!);
  const updateStatus = useUpdateInvoiceStatus();
  const [showPayment, setShowPayment] = useState(false);

  if (isLoading) return <div className="p-6 text-sm text-gray-500">Loading invoice...</div>;
  if (!invoice) return <div className="p-6 text-sm text-red-500">Invoice not found.</div>;

  const contact = invoice.contacts;
  const items = invoice.invoice_items ?? [];
  const paidAmount = (payments ?? [])
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);
  const outstanding = invoice.amount - paidAmount;

  const handleMarkSent = () => updateStatus.mutate({ id: invoice.id, status: "sent" });
  const handleMarkCancelled = () => {
    if (window.confirm("Cancel this invoice?")) {
      updateStatus.mutate({ id: invoice.id, status: "cancelled" });
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <Link to="/t/billing" className="hover:text-gray-900">Billing</Link>
        <span>/</span>
        <span className="font-medium text-gray-900">{invoice.invoice_number}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">{invoice.invoice_number}</h1>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColor(invoice.status)}`}>
              {invoice.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {contact?.first_name} {contact?.last_name ?? ""}
            {contact?.email && <span className="ml-2 text-gray-400">· {contact.email}</span>}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            Created {new Date(invoice.created_at).toLocaleDateString("en-IN")}
            {invoice.due_date && ` · Due ${new Date(invoice.due_date).toLocaleDateString("en-IN")}`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {invoice.status === "draft" && (
            <button
              onClick={handleMarkSent}
              disabled={updateStatus.isPending}
              className="rounded-lg border border-blue-300 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50"
            >
              Mark as Sent
            </button>
          )}
          {outstanding > 0 && invoice.status !== "cancelled" && invoice.status !== "refunded" && (
            <button
              onClick={() => setShowPayment(true)}
              className="rounded-lg bg-royal-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-royal-blue-light"
            >
              Record Payment
            </button>
          )}
          {invoice.status === "draft" && (
            <button
              onClick={handleMarkCancelled}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: items + payments */}
        <div className="space-y-6 lg:col-span-2">
          {/* Line items */}
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b px-5 py-3">
              <p className="text-sm font-semibold text-gray-900">Line Items</p>
            </div>
            <table className="min-w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Unit Price</th>
                  <th className="px-5 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3 text-sm text-gray-900">{item.description}</td>
                    <td className="px-3 py-3 text-right text-sm text-gray-600">{item.quantity}</td>
                    <td className="px-3 py-3 text-right text-sm text-gray-600">{fmtCurrency(item.unit_price, invoice.currency)}</td>
                    <td className="px-5 py-3 text-right text-sm font-medium text-gray-900">{fmtCurrency(item.total, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-gray-200 bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-5 py-3 text-right text-sm font-semibold text-gray-700">Total</td>
                  <td className="px-5 py-3 text-right text-sm font-bold text-gray-900">{fmtCurrency(invoice.amount, invoice.currency)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment history */}
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b px-5 py-3">
              <p className="text-sm font-semibold text-gray-900">Payment History</p>
            </div>
            {!payments?.length ? (
              <p className="px-5 py-4 text-sm text-gray-500">No payments recorded yet.</p>
            ) : (
              <table className="min-w-full">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Method</th>
                    <th className="px-3 py-2 text-left">Reference</th>
                    <th className="px-5 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-5 py-3 text-sm">{new Date(p.payment_date).toLocaleDateString("en-IN")}</td>
                      <td className="px-3 py-3 text-sm">{METHOD_LABELS[p.method]}</td>
                      <td className="px-3 py-3 text-sm text-gray-500">{p.reference_no ?? "—"}</td>
                      <td className="px-5 py-3 text-right text-sm font-medium text-green-700">{fmtCurrency(p.amount, invoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: summary */}
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <p className="mb-3 text-sm font-semibold text-gray-900">Summary</p>
            <dl className="space-y-2">
              <SummaryRow label="Invoice Total" value={fmtCurrency(invoice.amount, invoice.currency)} />
              <SummaryRow label="Paid" value={fmtCurrency(paidAmount, invoice.currency)} valueClass="text-green-700" />
              <div className="border-t pt-2">
                <SummaryRow
                  label="Outstanding"
                  value={fmtCurrency(outstanding, invoice.currency)}
                  valueClass={outstanding > 0 ? "text-orange-600 font-bold" : "text-gray-900"}
                />
              </div>
            </dl>
          </div>

          {invoice.notes && (
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Notes</p>
              <p className="text-sm text-gray-700">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>

      {showPayment && (
        <RecordPaymentDialog
          invoice={invoice}
          tenantId={tenantId}
          outstanding={outstanding}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}

function SummaryRow({ label, value, valueClass = "text-gray-900" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`font-medium ${valueClass}`}>{value}</dd>
    </div>
  );
}

function RecordPaymentDialog({
  invoice, tenantId, outstanding, onClose,
}: {
  invoice: Invoice; tenantId: string; outstanding: number; onClose: () => void;
}) {
  const { user } = useAuth();
  const updateStatus = useUpdateInvoiceStatus();
  const recordPayment = useRecordPayment();

  const [form, setForm] = useState({
    amount: outstanding,
    method: "cash" as PaymentMethod,
    payment_date: new Date().toISOString().split("T")[0]!,
    reference_no: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await recordPayment.mutateAsync({
      tenant_id: tenantId,
      invoice_id: invoice.id,
      contact_id: invoice.contact_id,
      amount: form.amount,
      method: form.method,
      payment_date: form.payment_date,
      reference_no: form.reference_no || undefined,
      notes: form.notes || undefined,
      recorded_by: user!.id,
    });

    // auto-update invoice status
    const newPaid = form.amount;
    if (newPaid >= invoice.amount) {
      await updateStatus.mutateAsync({
        id: invoice.id,
        status: "paid",
        paid_at: new Date().toISOString(),
      });
    } else if (invoice.status === "sent" || invoice.status === "overdue") {
      await updateStatus.mutateAsync({ id: invoice.id, status: "partial" });
    }

    onClose();
  };

  const isLoading = recordPayment.isPending || updateStatus.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Record Payment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          Invoice <span className="font-medium text-gray-900">{invoice.invoice_number}</span>
          {" · "}Outstanding: <span className="font-medium text-orange-600">{fmtCurrency(outstanding, invoice.currency)}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700">Amount (INR) *</label>
            <input
              type="number"
              required
              min={1}
              max={outstanding}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Method *</label>
            <select
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            >
              {Object.entries(METHOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Payment Date *</label>
            <input
              type="date"
              required
              value={form.payment_date}
              onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Reference / Transaction ID</label>
            <input
              value={form.reference_no}
              onChange={(e) => setForm({ ...form, reference_no: e.target.value })}
              placeholder="UPI ref, cheque no..."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Notes</label>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>

          {recordPayment.isError && (
            <p className="text-sm text-red-600">{(recordPayment.error as Error).message}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || form.amount <= 0}
              className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-light disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
