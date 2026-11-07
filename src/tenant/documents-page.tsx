import { useState } from "react";
import { useCrmDocuments } from "@/hooks/use-crm-documents";
import { usePageView } from "@/hooks/use-activity-log";
import { FileText, Download, Search, AlertCircle } from "lucide-react";

function fileIcon(type: string | null) {
  if (!type) return "📄";
  if (type.includes("pdf")) return "📕";
  if (type.includes("image")) return "🖼️";
  if (type.includes("word") || type.includes("doc")) return "📘";
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv")) return "📗";
  return "📄";
}

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsPage({ tenantId: _tenantId }: { tenantId: string }) {
  usePageView("documents");
  const [search, setSearch] = useState("");
  const { data: docs, isLoading, error } = useCrmDocuments();

  const filtered = (docs ?? []).filter((d) => {
    const q = search.toLowerCase();
    const label = d.file_url?.split("/").pop() ?? "";
    return !q || label.toLowerCase().includes(q);
  });

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Documents</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Client documents from MyAppz CRM
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents…"
          className="w-full rounded-md border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isLoading && (
        <div className="py-16 text-center text-sm text-gray-400">Loading documents…</div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Could not load documents from MyAppz.{" "}
            {(error as Error).message ?? "Check CRM connection."}
          </span>
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="py-16 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">
            {search ? "No documents match your search." : "No documents found in MyAppz."}
          </p>
        </div>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Document</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Size</th>
                <th className="px-4 py-3 text-left">Uploaded</th>
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none">{fileIcon(doc.file_type)}</span>
                      <span className="text-sm font-medium text-gray-900">
                        {doc.file_url?.split("/").pop() ?? "Untitled"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {doc.file_type ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatSize(doc.file_size)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {doc.created_at
                      ? new Date(doc.created_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {doc.file_url ? (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">No file</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
            {filtered.length} document{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
