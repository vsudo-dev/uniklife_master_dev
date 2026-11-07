import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { useUpdateBranch } from "@/hooks/use-branches";
import type { Branch, BranchStatus } from "@/types";

interface Props {
  branch: Branch;
  onClose: () => void;
}

export function EditBranchDialog({ branch, onClose }: Props) {
  const [name, setName] = useState(branch.name);
  const [city, setCity] = useState(branch.city ?? "");
  const [state, setState] = useState(branch.state ?? "");
  const [country, setCountry] = useState(branch.country);
  const [phone, setPhone] = useState(branch.phone ?? "");
  const [email, setEmail] = useState(branch.email ?? "");
  const [timezone, setTimezone] = useState(branch.timezone);
  const [status, setStatus] = useState<BranchStatus>(branch.status);
  const updateBranch = useUpdateBranch(branch.id, branch.tenant_id);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await updateBranch.mutateAsync({
      name: name.trim(),
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      country: country.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      timezone,
      status,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Edit Branch</h3>
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
              Branch Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                State
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Country
              </label>
              <input
                type="text"
                required
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Timezone
              </label>
              <input
                type="text"
                required
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as BranchStatus)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {updateBranch.error && (
            <p className="text-sm text-red-600">
              {(updateBranch.error as Error).message}
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
              disabled={updateBranch.isPending}
              className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-royal-blue-light disabled:opacity-50"
            >
              {updateBranch.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
