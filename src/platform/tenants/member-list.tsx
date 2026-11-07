import { useState } from "react";
import { UserPlus, Users } from "lucide-react";
import { useMemberships, useUpdateMembership } from "@/hooks/use-memberships";
import { AddMemberDialog } from "./add-member-dialog";
import { cn } from "@/lib/cn";
import type { MembershipStatus, TenantRole } from "@/types";

const STATUS_STYLES: Record<MembershipStatus, string> = {
  active: "bg-green-50 text-green-700",
  invited: "bg-blue-50 text-blue-700",
  suspended: "bg-red-50 text-red-700",
  removed: "bg-gray-100 text-gray-500",
};

const ROLES: TenantRole[] = ["tenant_admin", "practitioner", "staff", "customer"];

interface Props {
  tenantId: string;
}

export function MemberList({ tenantId }: Props) {
  const { data: members, isLoading } = useMemberships(tenantId);
  const updateMembership = useUpdateMembership(tenantId);
  const [showAdd, setShowAdd] = useState(false);

  function handleRoleChange(membershipId: string, role: TenantRole) {
    updateMembership.mutate({ id: membershipId, role });
  }

  function handleStatusChange(membershipId: string, status: MembershipStatus) {
    updateMembership.mutate({ id: membershipId, status });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Members</h3>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <UserPlus className="h-3 w-3" />
          Add Member
        </button>
      </div>

      {isLoading && (
        <p className="mt-3 text-sm text-gray-500">Loading members...</p>
      )}

      {members && members.length === 0 && (
        <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-6 text-center">
          <Users className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">
            No members yet. Add the first member to this tenant.
          </p>
        </div>
      )}

      {members && members.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  User
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Role
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="whitespace-nowrap px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">
                      {member.platform_users.full_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {member.platform_users.email}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(
                          member.id,
                          e.target.value as TenantRole
                        )
                      }
                      className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        STATUS_STYLES[member.status]
                      )}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {member.status === "active" && (
                      <button
                        onClick={() =>
                          handleStatusChange(member.id, "suspended")
                        }
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Suspend
                      </button>
                    )}
                    {member.status === "suspended" && (
                      <button
                        onClick={() =>
                          handleStatusChange(member.id, "active")
                        }
                        className="text-xs text-green-600 hover:text-green-800"
                      >
                        Reactivate
                      </button>
                    )}
                    {member.status !== "removed" && (
                      <button
                        onClick={() =>
                          handleStatusChange(member.id, "removed")
                        }
                        className="ml-3 text-xs text-gray-400 hover:text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddMemberDialog
          tenantId={tenantId}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
