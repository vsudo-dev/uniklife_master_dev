import { useState } from "react";
import { ClipboardList, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import {
  useActionRequests,
  useReviewActionRequest,
} from "@/hooks/use-action-requests";
import { PERMISSIONS } from "@/lib/permission-config";
import { cn } from "@/lib/cn";
import type { ActionRequestStatus } from "@/types";

const STATUS_STYLES: Record<ActionRequestStatus, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  expired: "bg-gray-100 text-gray-500",
};

function actionLabel(permissionKey: string | undefined, action: string): string {
  if (!permissionKey) return action;
  const perm = PERMISSIONS[permissionKey];
  if (!perm) return action;
  const def = perm.actions.find((a) => a.value === action);
  return def ? def.label : action;
}

export function ActionRequestsSection() {
  const { data: requests, isLoading } = useActionRequests();
  const reviewRequest = useReviewActionRequest();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewReason, setReviewReason] = useState("");

  const pendingCount = requests?.filter((r) => r.status === "pending").length ?? 0;

  async function handleReview(requestId: string, status: "approved" | "rejected") {
    if (!reviewReason.trim()) return;
    await reviewRequest.mutateAsync({ requestId, status, reason: reviewReason.trim() });
    setReviewingId(null);
    setReviewReason("");
  }

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Approval Queue
            </h2>
            {pendingCount > 0 && (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                {pendingCount} pending
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Action requests from support ops requiring your review.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Loading requests...
        </div>
      )}

      {requests && requests.length === 0 && (
        <div className="mt-6 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">No action requests yet.</p>
        </div>
      )}

      {requests && requests.length > 0 && (
        <div className="mt-4 space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className={cn(
                "rounded-lg border bg-white overflow-hidden",
                req.status === "pending" ? "border-yellow-200" : "border-gray-200"
              )}
            >
              <div className="flex items-start justify-between gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">
                      {actionLabel(req.grant?.permission_key, req.requested_action)}
                    </span>
                    <span className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                      STATUS_STYLES[req.status]
                    )}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Requester: <strong>{req.requester.full_name}</strong> ·
                    Tenant: <strong>{req.tenant.name}</strong> ·
                    {new Date(req.requested_at ?? req.expires_at).toLocaleString()}
                  </p>
                  {req.request_reason && (
                    <p className="mt-1.5 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                      {req.request_reason}
                    </p>
                  )}
                  {req.review_reason && req.status !== "pending" && (
                    <p className="mt-1.5 text-xs text-gray-500">
                      Review: {req.review_reason}
                    </p>
                  )}
                  {req.status === "approved" && req.executed_at && (
                    <p className="mt-1 text-xs text-green-600">
                      Executed {new Date(req.executed_at).toLocaleString()}
                    </p>
                  )}
                </div>

                {req.status === "pending" && reviewingId !== req.id && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => { setReviewingId(req.id); setReviewReason(""); }}
                      className="flex items-center gap-1 rounded-md bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => { setReviewingId(req.id); setReviewReason(""); }}
                      className="flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </button>
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
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal-blue resize-none"
                    placeholder="Reason for approving or rejecting…"
                    autoFocus
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleReview(req.id, "approved")}
                      disabled={!reviewReason.trim() || reviewRequest.isPending}
                      className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(req.id, "rejected")}
                      disabled={!reviewReason.trim() || reviewRequest.isPending}
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
                  {reviewRequest.error && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {reviewRequest.error instanceof Error ? reviewRequest.error.message : "Review failed"}
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
