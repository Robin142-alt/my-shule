"use client";
import { RecordTable } from "@/components/ui/record-table";
import { Bus } from "lucide-react";
import { Panel } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type OverviewRecord = {
  id: string;
  metric: string;
  value: string;
};

type OverviewData = {
  metrics: {
    total_vehicles: number;
    active_routes: number;
    students_transported: number;
    trips_today: number;
  };
  overviewList: OverviewRecord[];
};

export function OverviewWorkspace() {
  const { data, error, isLoading, refetch } = useSchoolQuery<OverviewData>('/admin-command/transport-manager/overview');
  const items = data?.overviewList || [];

  if (error) {
    return (
      <Panel title="Transport Overview" description="High-level transport operations dashboard." icon={Bus}>
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-black">Transport overview could not be loaded.</p>
          <p className="mt-1">{error.message}</p>
          <button type="button" onClick={() => void refetch()} className="mt-3 font-black underline">Retry</button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Transport Overview" description="High-level transport operations dashboard." icon={Bus}>
      <div className="app-metric-grid grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Vehicles</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_vehicles ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Active Routes</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.active_routes ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Students Transported</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.students_transported ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Trips Today</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.trips_today ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Metric</th>
              <th className="px-4 py-3 font-bold">Value</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={2} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={2} className="px-4 py-8 text-center text-[#64748B]">No school-scoped records are loaded for this workspace yet. Use the primary action, import, or connected setup workflow to create the first record.</td></tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{row.metric}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.value}</td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>
    </Panel>
  );
}
