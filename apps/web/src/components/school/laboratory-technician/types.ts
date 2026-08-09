export type LabItemType = "chemical" | "apparatus" | "consumable" | "safety_equipment";
export type LabItemSource = "equipment" | "chemical";

export type LabInventoryItem = {
  id: string;
  item_source: LabItemSource;
  item_name: string;
  item_type: LabItemType;
  category: string;
  quantity_available: string | number;
  quantity_total: string | number;
  minimum_stock_level: string | number;
  unit: string;
  storage_location: string | null;
  storage_location_id: string | null;
  tracking_method: "quantity" | "individual";
  condition: string | null;
  serial_number: string | null;
  model: string | null;
  concentration: string | null;
  expiry_date: string | null;
  safety_classification: string | null;
  status: string;
};

export type LabStorageLocation = {
  id: string;
  laboratory_or_store: string;
  room_or_section: string | null;
  cupboard_or_cabinet: string | null;
  shelf: string | null;
  full_path: string;
  is_active: boolean;
};

export type LabInventoryData = {
  items: LabInventoryItem[];
  locations: LabStorageLocation[];
};

export type PracticalRequestItem = {
  id: string;
  item_id: string | null;
  item_source: LabItemSource | null;
  item_name: string;
  unit: string;
  requested_quantity: string | number;
  approved_quantity: string | number | null;
  prepared_quantity: string | number;
  available_quantity: string | number;
  is_returnable: boolean;
  substitute_item_id: string | null;
  substitute_item_name: string | null;
  status: string;
  note: string | null;
};

export type PracticalRequest = {
  id: string;
  subject: string;
  class_name: string;
  practical_date: string;
  lesson_time: string;
  practical_title: string;
  teacher_id: string | null;
  teacher_name: string;
  learner_groups: number | null;
  teacher_notes: string | null;
  preparation_note: string | null;
  status: string;
  is_assessment: boolean;
  confidential_notes: string | null;
  rejection_reason: string | null;
  items: PracticalRequestItem[];
};

export type LabIssueLine = {
  id: string;
  item_id: string;
  item_source: LabItemSource;
  item_name: string;
  unit: string;
  quantity_issued: string | number;
  is_returnable: boolean;
  returned_good: string | number;
  used_or_consumed: string | number;
  broken: string | number;
  missing: string | number;
  still_with_teacher: string | number;
  sent_for_maintenance: string | number;
  spilled_or_wasted: string | number;
};

export type LabIssue = {
  id: string;
  practical_request_id: string;
  received_by: string;
  expected_return_at: string | null;
  status: string;
  notes: string | null;
  issued_at: string;
  subject: string;
  class_name: string;
  practical_title: string;
  teacher_id: string | null;
  teacher_name: string;
  practical_date: string;
  items: LabIssueLine[];
};

export type LabAttentionItem = {
  id: string;
  type: string;
  title: string;
  detail: string;
  severity: "warning" | "danger";
};

export type LabHomeData = {
  today: PracticalRequest[];
  awaiting_return: LabIssue[];
  attention: LabAttentionItem[];
};

export type LabBreakageLoss = {
  id: string;
  item_id: string | null;
  item_source: LabItemSource | null;
  item_name: string;
  quantity: string | number;
  date: string;
  practical_or_activity: string | null;
  class_name: string | null;
  teacher_name: string | null;
  classification: string;
  explanation: string;
  status: string;
  referral_required: boolean;
  referral_status: string | null;
  recorded_by: string | null;
};

export type LabStocktakeLine = {
  id: string;
  item_id: string;
  item_source: LabItemSource;
  item_name: string;
  unit: string;
  expected_quantity: string | number;
  counted_quantity: string | number | null;
  condition: string | null;
  difference: string | number | null;
};

export type LabStocktake = {
  id: string;
  location_id: string | null;
  location_name: string;
  category: string | null;
  item_type: LabItemType | null;
  status: "in_progress" | "ready_for_review" | "submitted";
  current_position: number;
  notes: string | null;
  started_at: string;
  submitted_at: string | null;
  items: LabStocktakeLine[];
};

export type LabSafetyCheck = {
  id: string;
  location_name: string;
  checked_on: string;
  next_due_date: string;
  checklist: Array<{ label: string; checked: boolean; note?: string }>;
  notes: string | null;
  status: string;
};

export type LaboratoryActionResponse<T> = {
  message: string;
  _offline?: boolean;
} & T;

export const LAB_UNITS = [
  "Pieces",
  "Bottles",
  "Packets",
  "Boxes",
  "Sets",
  "Pairs",
  "Litres",
  "Millilitres",
  "Kilograms",
  "Grams",
  "Metres",
  "Rolls",
  "Containers",
  "Custom",
] as const;

export const PRACTICAL_STATUS_LABELS: Record<string, string> = {
  requested: "Requested",
  under_review: "Under Review",
  partially_available: "Partially Available",
  preparing: "Preparing",
  ready: "Ready",
  issued: "Issued",
  partially_returned: "Partially Returned",
  completed: "Completed",
  rejected: "Rejected",
};

export function formatKenyanDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function statusTone(status: string): "success" | "info" | "warning" | "danger" | "neutral" {
  const normalized = status.toLowerCase().replaceAll("_", " ");
  if (["available", "ready", "returned", "completed", "submitted"].includes(normalized)) return "success";
  if (["issued", "in use", "preparing", "requested"].includes(normalized)) return "info";
  if (["low stock", "partially available", "partially returned", "under review", "under maintenance", "unresolved"].includes(normalized)) return "warning";
  if (["out of stock", "expired", "damaged", "missing", "overdue", "rejected"].includes(normalized)) return "danger";
  return "neutral";
}
