import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Building2, ChevronRight, Eye } from "lucide-react";
import { useTenants } from "@/hooks/use-tenants";
import { useAuthStore } from "@/hooks/use-auth";
import { CreateTenantDialog } from "./create-tenant-dialog";
import { cn } from "@/lib/cn";
import type { Tenant, TenantStatus, TenantRole } from "@/types";

const STATUS_STYLES: Record<TenantStatus, string> = {
  active:      "bg-green-50 text-green-700",
  pending:     "bg-yellow-50 text-yellow-700",
  suspended:   "bg-red-50 text-red-700",
  deactivated: "bg-gray-100 text-gray-500",
};

const ROLES: { role: TenantRole; label: string; color: string }[] = [
  { role: "tenant_admin",  label: "Admin",           color: "text-indigo-700 hover:bg-indigo-50" },
  { role: "practitioner",  label: "Practitioner",    color: "text-teal-700 hover:bg-teal-50"     },
  { role: "staff",         label: "Staff",           color: "text-purple-700 hover:bg-purple-50" },
  { role: "customer",      label: "Customer Portal", color: "text-pink-700 hover:bg-pink-50"     },
];

function RolePicker({ tenant, onPick }: { tenant: Tenant; onPick: (role: TenantRole) => void }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  // Close on outside click — use "click" not "mousedown" so role button onClick fires first
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !(e.target as Element).closest("[data-role-picker-dropdown]")
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleOutside);
    return () => document.removeEventListener("click", handleOutside);
  }, [open]);

  // Close on scroll
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [open]);

  function handleOpen() {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + window.scrollY + 4,
      right: window.innerWidth - rect.right,
    });
    setOpen((v) => !v);
  }

  const dropdown = open ? createPortal(
    <div
      data-role-picker-dropdown
      style={{ position: "absolute", top: pos.top, right: pos.right, zIndex: 9999 }}
      className="w-48 rounded-lg border border-gray-200 bg-white shadow-xl"
    >
      <p className="px-3 pt-2.5 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
        View as
      </p>
      {ROLES.map(({ role, label, color }) => (
        <button
          key={role}
          type="button"
          onClick={() => { onPick(role); setOpen(false); }}
          className={cn("w-full px-3 py-2.5 text-left text-sm font-medium transition-colors last:rounded-b-lg", color)}
        >
          {label}
        </button>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        title={`View as… ${tenant.name}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
      >
        <Eye className="h-4 w-4" />
      </button>
      {dropdown}
    </>
  );
}

export function TenantsPage() {
  const { data: tenants, isLoading, error } = useTenants();
  const { enterViewMode } = useAuthStore();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  function handleViewAs(tenant: Tenant, role: TenantRole) {
    if (!tenant.slug) return;
    enterViewMode({
      tenantId:   tenant.id,
      slug:       tenant.slug,
      tenantName: tenant.name,
      role,
      returnPath: window.location.pathname,
    });
    if (role === "customer") {
      navigate("/portal");
    } else if (role === "practitioner") {
      navigate(`/t/${tenant.slug}/workspace`);
    } else if (role === "staff") {
      navigate(`/t/${tenant.slug}/clients`);
    } else {
      navigate(`/t/${tenant.slug}/dashboard`);
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Tenants</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage all tenant organizations on the platform.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-royal-blue-light"
        >
          <Plus className="h-4 w-4" />
          Create Tenant
        </button>
      </div>

      {isLoading && (
        <div className="mt-8 text-center text-sm text-gray-500">
          Loading tenants...
        </div>
      )}

      {error && (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load tenants: {(error as Error).message}
        </div>
      )}

      {tenants && tenants.length === 0 && (
        <div className="mt-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-900">No tenants yet</p>
          <p className="mt-1 text-sm text-gray-500">Create your first tenant to get started.</p>
        </div>
      )}

      {tenants && tenants.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tier</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{tenant.name}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{tenant.slug}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize", STATUS_STYLES[tenant.status])}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm capitalize text-gray-500">{tenant.subscription_tier}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(tenant.created_at).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <RolePicker tenant={tenant} onPick={(role) => handleViewAs(tenant, role)} />
                      <Link
                        to={`/tenants/${tenant.id}`}
                        className="inline-flex items-center gap-1 text-sm text-royal-blue hover:text-royal-blue-light"
                      >
                        View
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateTenantDialog onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
