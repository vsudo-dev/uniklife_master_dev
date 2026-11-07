import { useState } from "react";
import { useAuthStore } from "@/hooks/use-auth";
import { useActionRequests, useReviewActionRequest } from "@/hooks/use-action-requests";
import { usePageView } from "@/hooks/use-activity-log";
import { CheckCircle, XCircle, Clock, AlertCircle, Plus } from "lucide-react";
import { CreateActionRequestDialog } from "@/platform/delegation/create-action-request-dialog";
import { PERMISSIONS } from "@/lib/permission-config";
import { cn } from "@/lib/cn";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-600",
  cancelled: "bg-gray-100 text-gray-600",
};

export function SupportRequestsPage() {
  usePageView("support-requests");
  const { user } = useAuthStore();
  const { data: requests, isLoading } = useActionRequests();
  const review = useReviewActionRequest();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [showCreate, setShowCreate] = useState(false);
  const isSupportOps = user?.platform_role === "support_ops";

  // Show requests where this user is the reviewer (assigned by grant) or super_admin sees all
  const myRequests = (requests ?? []).filter((r) =>
    user?.platform_role === "super_admin" || r.requester_id === user?.id
  );
  const shown = tab === "pending"
    ? myRequests.filter((r) => r.status === "pending")
    : myRequests;

  async function handleReview(requestId: string, status: "approved" | "rejected") {
    if (!reviewReason.trim()) return;
    await review.mutateAsync({ requestId, status, reason: reviewReason });
    setReviewingId(null);
    setReviewReason("");
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Action Requests</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Privileged actions submitted through delegation grants
          </p>
        </div>
        {isSupportOps && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Submit Request
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {(["pending", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {t === "pending" ? "Pending" : "All Requests"}
            {t === "pending" && myRequests.filter((r) => r.status === "pending").length > 0 && (
              <span className="ml-1.5 rounded-full bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-800">
                {myRequests.filter((r) => r.status === "pending").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-gray-400">Loading requests…</p>}

      {!isLoading && shown.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
          <Clock className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">
            {tab === "pending" ? "No pending action requests." : "No action requests yet."}
          </p>
        </div>
      )}

      {showCreate && (
        <CreateActionRequestDialog onClose={() => setShowCreate(false)} />
      )}

      {!isLoading && shown.length > 0 && (
        <div className="space-y-3">
          {shown.map((req) => (
            <div
              key={req.id}
              className="rounded-lg border border-gray-200 bg-white overflow-x-auto"
            >
              <div className="flex items-start justify-between gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {(() => {
                        const pk = req.grant?.permission_key;
                        if (!pk) return req.requested_action;
                        const perm = PERMISSIONS[pk];
                        const def = perm?.actions.find((a) => a.value === req.requested_action);
                        return def?.label ?? req.requested_action;
                      })()}
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[req.status] ?? "bg-gray-100 text-gray-600")}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Tenant: <strong>{req.tenant?.name ?? "—"}</strong> ·
                    Requested by: <strong>{req.requester?.full_name}</strong> ·{" "}
                    {new Date(req.requested_at).toLocaleString()}
                  </p>
                  {req.request_reason && (
                    <p className="mt-1.5 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                      {req.request_reason}
                    </p>
                  )}
                  {req.review_reason && req.status !== "pending" && (
                    <p className="mt-1.5 text-xs text-gray-500">
                      Review note: {req.review_reason}
                    </p>
                  )}
                </div>

                {req.status === "pending" && user?.platform_role === "super_admin" && (
                  <div className="shrink-0">
                    {reviewingId === req.id ? null : (
                      <button
                        onClick={() => setReviewingId(req.id)}
                        className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Review
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Inline review form */}
              {reviewingId === req.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-4">
                  <p className="mb-2 text-xs font-medium text-gray-700">Review reason (required)</p>
                  <textarea
                    value={reviewReason}
                    onChange={(e) => setReviewReason(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Reason for approving or rejecting…"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleReview(req.id, "approved")}
                      disabled={!reviewReason.trim() || review.isPending}
                      className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(req.id, "rejected")}
                      disabled={!reviewReason.trim() || review.isPending}
                      className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </button>
                    <button
                      onClick={() => { setReviewingId(null); setReviewReason(""); }}
                      className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  {review.error && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {review.error instanceof Error ? review.error.message : "Review failed"}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
