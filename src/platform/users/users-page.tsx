import { useState } from "react";
import { Plus, Users, Shield, UserMinus, UserCheck, Search, Copy, Check } from "lucide-react";
import {
  useSupportTeam,
  useAddSupportMember,
  useUpdateSupportMember,
  type SupportTeamMemberWithUser,
} from "@/hooks/use-support-team";
import { useDelegations } from "@/hooks/use-delegations";
import { cn } from "@/lib/cn";
import type { SupportTeamStatus } from "@/types";

const STATUS_STYLES: Record<SupportTeamStatus, string> = {
  active: "bg-green-50 text-green-700",
  inactive: "bg-yellow-50 text-yellow-700",
  removed: "bg-red-50 text-red-700",
};

export function UsersPage() {
  const { data: members, isLoading } = useSupportTeam();
  const { data: grants } = useDelegations();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = members?.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.platform_users.full_name.toLowerCase().includes(q) ||
      m.platform_users.email.toLowerCase().includes(q) ||
      (m.label ?? "").toLowerCase().includes(q)
    );
  });

  function activeGrantCount(userId: string) {
    return grants?.filter(
      (g) => g.grantee_user_id === userId && g.status === "active"
    ).length ?? 0;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Support Team
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your support team roster. Add members here, then enable
            delegations from the Delegation page.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-royal-blue px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-royal-blue-light"
        >
          <Plus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      {/* Search */}
      {members && members.length > 0 && (
        <div className="mt-4 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email or label..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-royal-blue focus:outline-none focus:ring-1 focus:ring-royal-blue"
          />
        </div>
      )}

      {isLoading && (
        <div className="mt-8 text-center text-sm text-gray-500">
          Loading support team...
        </div>
      )}

      {!isLoading && (!filtered || filtered.length === 0) && (
        <div className="mt-12 text-center">
          <Users className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-900">
            {search ? "No matching members" : "No support team members yet"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {search
              ? "Try a different search term."
              : "Add platform users as support team members to manage delegations."}
          </p>
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Name", "Label", "Status", "Active Grants", "Added By", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  activeGrants={activeGrantCount(m.user_id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddMemberDialog onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function MemberRow({
  member,
  activeGrants,
}: {
  member: SupportTeamMemberWithUser;
  activeGrants: number;
}) {
  const update = useUpdateSupportMember();
  const isActive = member.status === "active";

  function toggleStatus() {
    update.mutate({
      id: member.id,
      user_id: member.user_id,
      status: isActive ? "inactive" : "active",
    });
  }

  function removeMember() {
    if (!confirm(`Remove ${member.platform_users.full_name} from the support team?`)) return;
    update.mutate({ id: member.id, user_id: member.user_id, status: "removed" });
  }

  return (
    <tr>
      <td className="whitespace-nowrap px-4 py-3">
        <p className="text-sm font-medium text-gray-900">
          {member.platform_users.full_name}
        </p>
        <p className="text-xs text-gray-500">{member.platform_users.email}</p>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
        {member.label ?? "—"}
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
        {activeGrants > 0 ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700">
            <Shield className="h-3.5 w-3.5" />
            {activeGrants}
          </span>
        ) : (
          <span className="text-sm text-gray-400">None</span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
        {member.added_by_user?.full_name ?? "—"}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={toggleStatus}
            disabled={update.isPending}
            className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 disabled:opacity-50"
            title={isActive ? "Deactivate" : "Reactivate"}
          >
            {isActive ? (
              <UserMinus className="h-3.5 w-3.5" />
            ) : (
              <UserCheck className="h-3.5 w-3.5" />
            )}
            {isActive ? "Deactivate" : "Activate"}
          </button>
          <button
            onClick={removeMember}
            disabled={update.isPending}
            className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </td>
    </tr>
  );
}

function AddMemberDialog({ onClose }: { onClose: () => void }) {
  const addMember = useAddSupportMember();
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);

  const signupUrl = `${window.location.origin}/auth/signup`;
  const isNotFoundError = addMember.error && (addMember.error as Error).message.includes("not found");

  function copySignupLink() {
    navigator.clipboard.writeText(signupUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await addMember.mutateAsync({
      email: email.trim(),
      label: label.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">
          Add Support Team Member
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          The user must already have a platform account. If they don't,
          share the signup link below.
        </p>

        {/* Signup link share section */}
        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs font-medium text-blue-800 mb-1.5">
            Signup link for new members
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-white px-2 py-1 text-xs text-gray-700 border border-blue-200">
              {signupUrl}
            </code>
            <button
              type="button"
              onClick={copySignupLink}
              className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); addMember.reset(); }}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Label (optional)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
              placeholder="e.g. L1 Support, Billing Ops"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-royal-blue focus:ring-1 focus:ring-royal-blue focus:outline-none"
              placeholder="Internal notes about this team member"
            />
          </div>

          {addMember.error && (
            <div className={cn(
              "rounded-lg border p-3 text-sm",
              isNotFoundError
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-red-200 bg-red-50 text-red-700"
            )}>
              <p className="font-medium">{(addMember.error as Error).message}</p>
              {isNotFoundError && (
                <p className="mt-1 text-xs">
                  Share the signup link above so they can create their account first.
                </p>
              )}
            </div>
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
