import { useState } from "react";
import { useCreateIndustry } from "@/hooks/use-industries";

export function CreateIndustryDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateIndustry();
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultRoles, setDefaultRoles] = useState("practitioner, staff, customer");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const roles = defaultRoles
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    create.mutate(
      {
        key: key.toUpperCase().replace(/\s+/g, "_"),
        name,
        description: description || null,
        default_roles: roles,
        nav_config: {},
        dashboard_config: {},
        vocabulary_defaults: {},
        status: "draft",
        version: "1.0.0",
      },
      { onSuccess: onClose }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900">Add Industry</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Key</label>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g. HEALTH_WELLNESS"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Health & Wellness"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Default Roles (comma-separated)</label>
            <input
              value={defaultRoles}
              onChange={(e) => setDefaultRoles(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-light disabled:opacity-50"
            >
              {create.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
        {create.isError && (
          <p className="mt-3 text-sm text-red-600">{(create.error as Error).message}</p>
        )}
      </div>
    </div>
  );
}
