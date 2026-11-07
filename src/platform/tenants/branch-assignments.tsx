import { useState } from "react";
import { UserPlus, Users, X } from "lucide-react";
import {
  useBranchAssignments,
  useAssignToBranch,
  useRemoveBranchAssignment,
} from "@/hooks/use-branch-assignments";
import { useMemberships } from "@/hooks/use-memberships";
import type { Branch } from "@/types";

interface Props {
  branch: Branch;
  onClose: () => void;
}

export function BranchAssignments({ branch, onClose }: Props) {
  const { data: assignments, isLoading } = useBranchAssignments(branch.id);
  const { data: members } = useMemberships(branch.tenant_id);
  const assignToBranch = useAssignToBranch();
  const removeAssignment = useRemoveBranchAssignment();
  const [selectedMembership, setSelectedMembership] = useState("");

  const assignedMembershipIds = new Set(
    assignments?.map((a) => a.membership_id) ?? []
  );
  const unassignedMembers = members?.filter(
    (m) => m.status === "active" && !assignedMembershipIds.has(m.id)
  );

  function handleAssign() {
    if (!selectedMembership) return;
    assignToBranch.mutate({
      membershipId: selectedMembership,
      branchId: branch.id,
    });
    setSelectedMembership("");
  }

  function handleRemove(assignmentId: string) {
    removeAssignment.mutate({ assignmentId, branchId: branch.id });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {branch.name} — Assignments
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <select
            value={selectedMembership}
            onChange={(e) => setSelectedMembership(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
          >
            <option value="">Select a member to assign...</option>
            {unassignedMembers?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.platform_users.full_name} ({m.role.replace("_", " ")})
              </option>
            ))}
          </select>
          <button
            onClick={handleAssign}
            disabled={!selectedMembership || assignToBranch.isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-royal-blue px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-royal-blue-light disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            Assign
          </button>
        </div>

        {assignToBranch.error && (
          <p className="mt-2 text-sm text-red-600">
            {(assignToBranch.error as Error).message}
          </p>
        )}

        <div className="mt-4">
          {isLoading && (
            <p className="text-sm text-gray-500">Loading assignments...</p>
          )}

          {assignments && assignments.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
              <Users className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                No members assigned to this branch yet.
              </p>
            </div>
          )}

          {assignments && assignments.length > 0 && (
            <div className="space-y-2">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {a.membership.platform_users.full_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {a.membership.platform_users.email} —{" "}
                      {a.membership.role.replace("_", " ")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(a.id)}
                    disabled={removeAssignment.isPending}
                    className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
