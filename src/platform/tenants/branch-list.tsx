import { useState } from "react";
import { MapPin, Plus, Pencil, Star, Users } from "lucide-react";
import { useBranches } from "@/hooks/use-branches";
import { CreateBranchDialog } from "./create-branch-dialog";
import { EditBranchDialog } from "./edit-branch-dialog";
import { BranchAssignments } from "./branch-assignments";
import { cn } from "@/lib/cn";
import type { Branch, BranchStatus } from "@/types";

const STATUS_STYLES: Record<BranchStatus, string> = {
  active: "bg-green-50 text-green-700",
  suspended: "bg-red-50 text-red-700",
  closed: "bg-gray-100 text-gray-500",
};

interface Props {
  tenantId: string;
}

export function BranchList({ tenantId }: Props) {
  const { data: branches, isLoading } = useBranches(tenantId);
  const [showCreate, setShowCreate] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [assignBranch, setAssignBranch] = useState<Branch | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Branches</h3>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <Plus className="h-3 w-3" />
          Add Branch
        </button>
      </div>

      {isLoading && (
        <p className="mt-3 text-sm text-gray-500">Loading branches...</p>
      )}

      {branches && branches.length === 0 && (
        <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-6 text-center">
          <MapPin className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">
            No branches yet. Add the first branch for this tenant.
          </p>
        </div>
      )}

      {branches && branches.length > 0 && (
        <div className="mt-3 space-y-2">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {branch.is_primary && (
                  <Star className="h-4 w-4 fill-gold text-gold" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {branch.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {[branch.city, branch.state, branch.country]
                      .filter(Boolean)
                      .join(", ") || "No location set"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                    STATUS_STYLES[branch.status]
                  )}
                >
                  {branch.status}
                </span>
                <button
                  onClick={() => setAssignBranch(branch)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title="Manage assignments"
                >
                  <Users className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setEditBranch(branch)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title="Edit branch"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateBranchDialog
          tenantId={tenantId}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editBranch && (
        <EditBranchDialog
          branch={editBranch}
          onClose={() => setEditBranch(null)}
        />
      )}

      {assignBranch && (
        <BranchAssignments
          branch={assignBranch}
          onClose={() => setAssignBranch(null)}
        />
      )}
    </div>
  );
}
