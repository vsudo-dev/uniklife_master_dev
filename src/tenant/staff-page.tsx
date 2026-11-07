import { useState } from "react";
import { Users } from "lucide-react";
import { useMemberships } from "@/hooks/use-memberships";
import { useStaffProfiles, useUpsertStaffProfile } from "@/hooks/use-staff";
import { useBranches } from "@/hooks/use-branches";
import type { TenantRole, StaffStatus } from "@/types";

const ROLE_COLORS: Record<TenantRole, string> = {
  tenant_admin: "bg-purple-100 text-purple-800",
  practitioner: "bg-blue-100 text-blue-800",
  staff: "bg-gray-100 text-gray-700",
  customer: "bg-green-100 text-green-800",
};

const STATUS_COLORS: Record<StaffStatus, string> = {
  active: "bg-green-100 text-green-800",
  on_leave: "bg-yellow-100 text-yellow-800",
  terminated: "bg-red-100 text-red-700",
};

export function StaffPage({ tenantId }: { tenantId: string }) {
  const { data: memberships, isLoading } = useMemberships(tenantId);
  const { data: staffProfiles } = useStaffProfiles(tenantId);
  const { data: branches } = useBranches(tenantId);
  const [editTarget, setEditTarget] = useState<string | null>(null);

  const staff = memberships?.filter((m) =>
    ["tenant_admin", "practitioner", "staff"].includes(m.role) && m.status === "active"
  ) ?? [];

  function getProfile(userId: string) {
    return staffProfiles?.find((p) => p.user_id === userId);
  }

  return (
    <div className="p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Staff</h2>
        <p className="mt-1 text-sm text-gray-500">Manage your team, roles and profiles.</p>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : !staff.length ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16">
            <Users className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-900">No staff members yet</p>
            <p className="mt-1 text-sm text-gray-500">Add members from the tenant detail page.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Name", "Role", "Job Title", "Branch", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staff.map((m) => {
                  const profile = getProfile(m.user_id);
                  const isEditing = editTarget === m.user_id;
                  return (
                    <>
                      <tr key={m.id} className={isEditing ? "bg-indigo-50" : undefined}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{m.platform_users.full_name}</p>
                          <p className="text-xs text-gray-500">{m.platform_users.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${ROLE_COLORS[m.role as TenantRole]}`}>
                            {m.role.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{profile?.job_title ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{profile?.branches?.name ?? "—"}</td>
                        <td className="px-4 py-3">
                          {profile ? (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[profile.status as StaffStatus]}`}>
                              {profile.status.replace("_", " ")}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">No profile</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setEditTarget(isEditing ? null : m.user_id)}
                            className="text-xs text-indigo-600 hover:text-indigo-800"
                          >
                            {isEditing ? "Close" : "Edit Profile"}
                          </button>
                        </td>
                      </tr>
                      {isEditing && (
                        <tr key={`edit-${m.user_id}`}>
                          <td colSpan={6} className="bg-indigo-50 px-4 py-4 border-t border-indigo-100">
                            <EditProfileInline
                              tenantId={tenantId}
                              userId={m.user_id}
                              name={m.platform_users.full_name}
                              existing={profile}
                              branches={branches ?? []}
                              onClose={() => setEditTarget(null)}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EditProfileInline({
  tenantId,
  userId,
  name,
  existing,
  branches,
  onClose,
}: {
  tenantId: string;
  userId: string;
  name: string;
  existing?: { job_title?: string | null; specialization?: string | null; branch_id?: string | null; hire_date?: string | null; bio?: string | null; status: StaffStatus };
  branches: { id: string; name: string }[];
  onClose: () => void;
}) {
  const upsert = useUpsertStaffProfile();

  const [form, setForm] = useState({
    job_title: existing?.job_title ?? "",
    specialization: existing?.specialization ?? "",
    branch_id: existing?.branch_id ?? "",
    hire_date: existing?.hire_date ?? "",
    bio: existing?.bio ?? "",
    status: (existing?.status ?? "active") as StaffStatus,
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await upsert.mutateAsync({
      tenant_id: tenantId,
      user_id: userId,
      job_title: form.job_title || undefined,
      specialization: form.specialization || undefined,
      branch_id: form.branch_id || undefined,
      hire_date: form.hire_date || undefined,
      bio: form.bio || undefined,
      status: form.status,
    });
    onClose();
  }

  return (
    <div>
      <p className="mb-3 text-sm font-medium text-gray-900">Editing: {name}</p>
      <form onSubmit={handleSave} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Job Title</label>
          <input value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-royal-blue focus:outline-none" placeholder="e.g. Nutritionist" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Specialization</label>
          <input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-royal-blue focus:outline-none" placeholder="e.g. Weight Loss" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Branch</label>
          <select value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-royal-blue focus:outline-none">
            <option value="">— None —</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hire Date</label>
          <input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-royal-blue focus:outline-none" />
        </div>
        <div className="col-span-2 sm:col-span-3">
          <label className="block text-xs text-gray-500 mb-1">Bio</label>
          <input value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-royal-blue focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StaffStatus })} className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-royal-blue focus:outline-none">
            <option value="active">Active</option>
            <option value="on_leave">On Leave</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
        <div className="col-span-2 sm:col-span-4 flex gap-2">
          <button type="submit" disabled={upsert.isPending} className="rounded bg-royal-blue px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">{upsert.isPending ? "Saving…" : "Save Profile"}</button>
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700">Cancel</button>
        </div>
      </form>
    </div>
  );
}
