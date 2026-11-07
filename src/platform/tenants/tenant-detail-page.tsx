import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { useTenant } from "@/hooks/use-tenants";
import { EditTenantDialog } from "./edit-tenant-dialog";
import { BranchList } from "./branch-list";
import { MemberList } from "./member-list";
import { EntitlementList } from "./entitlement-list";
import { BrandingSection } from "./branding-section";
import { cn } from "@/lib/cn";
import type { TenantStatus } from "@/types";

const STATUS_STYLES: Record<TenantStatus, string> = {
  active: "bg-green-50 text-green-700",
  pending: "bg-yellow-50 text-yellow-700",
  suspended: "bg-red-50 text-red-700",
  deactivated: "bg-gray-100 text-gray-500",
};

export function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: tenant, isLoading, error } = useTenant(id);
  const [showEdit, setShowEdit] = useState(false);

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-gray-500">Loading tenant...</div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="p-4 sm:p-6">
        <Link
          to="/tenants"
          className="inline-flex items-center gap-1 text-sm text-royal-blue hover:text-royal-blue-light"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tenants
        </Link>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error ? (error as Error).message : "Tenant not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <Link
        to="/tenants"
        className="inline-flex items-center gap-1 text-sm text-royal-blue hover:text-royal-blue-light"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tenants
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {tenant.name}
          </h2>
          <p className="mt-1 text-sm text-gray-500">/{tenant.slug}</p>
        </div>
        <button
          onClick={() => setShowEdit(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Status">
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
              STATUS_STYLES[tenant.status]
            )}
          >
            {tenant.status}
          </span>
        </InfoCard>
        <InfoCard label="Subscription Tier">
          <span className="capitalize">{tenant.subscription_tier}</span>
        </InfoCard>
        <InfoCard label="Created">
          {new Date(tenant.created_at).toLocaleDateString()}
        </InfoCard>
        <InfoCard label="Last Updated">
          {new Date(tenant.updated_at).toLocaleDateString()}
        </InfoCard>
      </div>

      <div className="mt-8">
        <BranchList tenantId={tenant.id} />
      </div>

      <div className="mt-8">
        <MemberList tenantId={tenant.id} />
      </div>

      <EntitlementList tenantId={tenant.id} />

      <BrandingSection tenantId={tenant.id} tenantName={tenant.name} />

      {showEdit && (
        <EditTenantDialog
          tenant={tenant}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}

function InfoCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <div className="mt-1 text-sm text-gray-900">{children}</div>
    </div>
  );
}
