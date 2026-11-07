import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { useUpdateTenant } from "@/hooks/use-tenants";
import type { Tenant, TenantStatus, SubscriptionTier } from "@/types";

interface Props {
  tenant: Tenant;
  onClose: () => void;
}

export function EditTenantDialog({ tenant, onClose }: Props) {
  const [name, setName] = useState(tenant.name);
  const [slug, setSlug] = useState(tenant.slug);
  const [status, setStatus] = useState<TenantStatus>(tenant.status);
  const [tier, setTier] = useState<SubscriptionTier>(
    tenant.subscription_tier
  );
  const updateTenant = useUpdateTenant(tenant.id);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await updateTenant.mutateAsync({
      name: name.trim(),
      slug: slug.trim(),
      status,
      subscription_tier: tier,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Edit Tenant</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Organization Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Slug
            </label>
            <input
              type="text"
              required
              pattern="[a-z0-9-]+"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TenantStatus)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
            >
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Subscription Tier
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as SubscriptionTier)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
            >
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          {updateTenant.error && (
            <p className="text-sm text-red-600">
              {(updateTenant.error as Error).message}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateTenant.isPending}
              className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-royal-blue-light disabled:opacity-50"
            >
              {updateTenant.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
