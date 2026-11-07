import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { useAddMember } from "@/hooks/use-memberships";
import type { TenantRole } from "@/types";

interface Props {
  tenantId: string;
  onClose: () => void;
}

export function AddMemberDialog({ tenantId, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TenantRole>("staff");
  const addMember = useAddMember();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await addMember.mutateAsync({
      tenant_id: tenantId,
      email: email.trim(),
      role,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Add Member</h3>
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
              User Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
              placeholder="user@example.com"
            />
            <p className="mt-1 text-xs text-gray-400">
              User must have an existing platform account.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as TenantRole)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
            >
              <option value="tenant_admin">Tenant Admin</option>
              <option value="practitioner">Practitioner</option>
              <option value="staff">Staff</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          {addMember.error && (
            <p className="text-sm text-red-600">
              {(addMember.error as Error).message}
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
              disabled={addMember.isPending}
              className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-royal-blue-light disabled:opacity-50"
            >
              {addMember.isPending ? "Adding..." : "Add Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
