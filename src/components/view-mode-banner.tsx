import { useNavigate } from "react-router-dom";
import { Eye, X } from "lucide-react";
import { useAuthStore } from "@/hooks/use-auth";

const ROLE_LABELS: Record<string, string> = {
  tenant_admin:  "Admin",
  practitioner:  "Practitioner",
  staff:         "Staff",
  customer:      "Customer Portal",
};

const ROLE_COLORS: Record<string, string> = {
  tenant_admin:  "bg-indigo-600",
  practitioner:  "bg-teal-600",
  staff:         "bg-purple-600",
  customer:      "bg-pink-600",
};

export function ViewModeBanner() {
  const { viewMode, exitViewMode, user } = useAuthStore();
  const navigate = useNavigate();

  if (!viewMode || user?.platform_role !== "super_admin") return null;

  function handleExit() {
    const returnPath = viewMode?.returnPath ?? "/";
    exitViewMode();
    navigate(returnPath, { replace: true });
  }

  const roleColor = ROLE_COLORS[viewMode.role] ?? "bg-gray-600";
  const roleLabel = ROLE_LABELS[viewMode.role] ?? viewMode.role;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-white">
        <Eye className="h-4 w-4 shrink-0" />
        <span>Viewing as</span>
        <span className="font-semibold">{viewMode.tenantName}</span>
        <span className="text-amber-200">·</span>
        <span className={`rounded px-1.5 py-0.5 text-xs font-semibold text-white ${roleColor}`}>
          {roleLabel}
        </span>
        {viewMode.contactId && (
          <span className="text-xs text-amber-100">(specific contact)</span>
        )}
      </div>
      <button
        type="button"
        onClick={handleExit}
        className="flex items-center gap-1 rounded bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700"
      >
        <X className="h-3 w-3" />
        Exit View Mode
      </button>
    </div>
  );
}
