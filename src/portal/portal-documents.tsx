import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/use-auth";
import { useCrmDocuments } from "@/hooks/use-crm-documents";
import { useContacts } from "@/hooks/use-contacts";
import { FileText, Download } from "lucide-react";
import type { Contact } from "@/types";

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PortalDocuments() {
  const { user, activeTenantId, viewMode } = useAuthStore();
  const tenantId = activeTenantId ?? "";

  // When super admin views as a specific customer, use their contactId directly
  const { data: contacts } = useContacts(viewMode?.contactId ? tenantId : "");
  const viewedContact = viewMode?.contactId
    ? contacts?.find((c) => c.id === viewMode.contactId)
    : undefined;

  const { data: contact } = useQuery({
    queryKey: ["my-contact", tenantId, user?.auth_user_id, viewMode?.contactId],
    enabled: !!tenantId && (!!user?.auth_user_id || !!viewMode?.contactId),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (viewMode?.contactId) {
        // Super admin viewing as a specific contact
        const { data, error } = await supabase
          .from("contacts")
          .select("id, crm_contact_id")
          .eq("id", viewMode.contactId)
          .single();
        if (error) return null;
        return data as Pick<Contact, "id" | "crm_contact_id">;
      }
      const { data, error } = await supabase
        .from("contacts")
        .select("id, crm_contact_id")
        .eq("tenant_id", tenantId)
        .eq("auth_user_id", user!.auth_user_id!)
        .single();
      if (error) return null;
      return data as Pick<Contact, "id" | "crm_contact_id">;
    },
  });
  void viewedContact; // suppress unused warning

  const { data: documents, isLoading } = useCrmDocuments(contact?.crm_contact_id ?? undefined);

  if (isLoading) return <div className="p-6 text-sm text-gray-500">Loading…</div>;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">My Documents</h2>
        <p className="mt-1 text-sm text-gray-500">Files shared by your practitioner</p>
      </div>

      {!contact && (
        <p className="text-sm text-gray-500">Profile not linked. Contact your practitioner.</p>
      )}

      {contact && !documents?.length && (
        <p className="text-sm text-gray-500">No documents on file.</p>
      )}

      {documents && documents.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                  <FileText className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {doc.file_url?.split("/").pop() ?? "Document"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {doc.file_type ?? "File"}{doc.file_size ? ` · ${formatBytes(doc.file_size)}` : ""}
                    {" · "}
                    {new Date(doc.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </p>
                </div>
                {doc.file_url && (
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100"
                  >
                    <Download className="h-3.5 w-3.5 text-gray-500" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
