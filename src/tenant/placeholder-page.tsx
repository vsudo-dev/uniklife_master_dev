import { useLocation } from "react-router-dom";

export function PlaceholderPage() {
  const { pathname } = useLocation();
  const section = pathname.split("/").pop() ?? "page";

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-lg font-semibold capitalize text-gray-900">{section}</h2>
      <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
        This module will be built in a later phase.
      </div>
    </div>
  );
}
