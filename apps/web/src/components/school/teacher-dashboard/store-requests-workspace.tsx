import { ShoppingCart } from "lucide-react";
import { Panel, RecordTable } from "./shared-components";
import { TeacherAction, TeacherView } from "./types";

export function StoreRequestsWorkspace({
  onStartAction,
}: {
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
}) {
  return (
    <Panel title="Store Requests" description="Request teaching materials from the store or lab." icon={ShoppingCart}>
      <div className="mb-4">
        <button type="button" onClick={() => onStartAction("requisition", "store-requests", "Requisition form ready.")} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">New Store Request</button>
      </div>
      <RecordTable
        columns={["Req No.", "Item", "Quantity", "Needed By", "Status", "Store Response", "Actions"]}
        rows={[]}
        emptyState="No store requests made."
      />
    </Panel>
  );
}
