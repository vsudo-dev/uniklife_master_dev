import { useState } from "react";
import { useIndustries, useUpdateIndustry } from "@/hooks/use-industries";
import { CreateIndustryDialog } from "./create-industry-dialog";
import { cn } from "@/lib/cn";
import type { IndustryProfile } from "@/types";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  draft: "bg-yellow-50 text-yellow-700",
  deprecated: "bg-red-50 text-red-700",
};

export function IndustriesPage() {
  const { data: industries, isLoading, error } = useIndustries();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<IndustryProfile | null>(null);

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Industry Registry</h2>
          <p className="mt-1 text-sm text-gray-500">
            Global industry profiles that define vertical configurations.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-light"
        >
          Add Industry
        </button>
      </div>

      {isLoading && (
        <div className="mt-8 text-center text-sm text-gray-500">Loading industries...</div>
      )}

      {error && (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load: {(error as Error).message}
        </div>
      )}

      {industries && industries.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((ind) => (
            <IndustryCard key={ind.id} industry={ind} onEdit={() => setEditing(ind)} />
          ))}
        </div>
      )}

      {industries && industries.length === 0 && (
        <div className="mt-12 text-center text-sm text-gray-500">No industries registered yet.</div>
      )}

      {showCreate && <CreateIndustryDialog onClose={() => setShowCreate(false)} />}
      {editing && <EditIndustryDialog industry={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function IndustryCard({ industry, onEdit }: { industry: IndustryProfile; onEdit: () => void }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{industry.name}</h3>
          <p className="mt-0.5 font-mono text-xs text-gray-400">{industry.key}</p>
        </div>
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
            STATUS_STYLES[industry.status] ?? "bg-gray-100 text-gray-600"
          )}
        >
          {industry.status}
        </span>
      </div>
      {industry.description && (
        <p className="mt-2 text-sm text-gray-500 line-clamp-2">{industry.description}</p>
      )}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <span>v{industry.version}</span>
        <span>Roles: {industry.default_roles.join(", ") || "—"}</span>
      </div>
      <button
        onClick={onEdit}
        className="mt-3 text-xs font-medium text-royal-blue hover:text-royal-blue-light"
      >
        Edit
      </button>
    </div>
  );
}

function EditIndustryDialog({
  industry,
  onClose,
}: {
  industry: IndustryProfile;
  onClose: () => void;
}) {
  const update = useUpdateIndustry();
  const [name, setName] = useState(industry.name);
  const [description, setDescription] = useState(industry.description ?? "");
  const [status, setStatus] = useState(industry.status);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate(
      { id: industry.id, name, description: description || null, status },
      { onSuccess: onClose }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900">Edit Industry</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as IndustryProfile["status"])}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="deprecated">Deprecated</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
            <button
              type="submit"
              disabled={update.isPending}
              className="rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white hover:bg-royal-blue-light disabled:opacity-50"
            >
              {update.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
