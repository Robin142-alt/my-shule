"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Beaker,
  Boxes,
  ChevronDown,
  Download,
  FileUp,
  FlaskConical,
  Glasses,
  MapPinPlus,
  PackagePlus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { useOptionalAuth } from "@/lib/auth/auth-context";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { getCurrentSchoolId } from "@/lib/school/school-operational-store";
import {
  LabQuickActions,
  Panel,
  SaveState,
  StatusChip,
  WorkspaceEmpty,
  WorkspaceError,
  cn,
} from "./shared";
import {
  LAB_UNITS,
  formatKenyanDate,
  statusTone,
  type LabInventoryData,
  type LabInventoryItem,
  type LabItemType,
  type LabStorageLocation,
  type LaboratoryActionResponse,
} from "./types";
import { createSubmissionId, isPendingSync, useLaboratoryMutation } from "./use-laboratory-mutation";

const ITEM_DRAFT_KEY = "myshule:labs:add-item-draft:v1";
const STOCK_PAGE_SIZE = 40;
const CSV_REQUIRED_HEADERS = [
  "item_name",
  "item_type",
  "category",
  "quantity",
  "unit",
  "storage_location",
  "minimum_stock_level",
] as const;
const CSV_OPTIONAL_HEADERS = [
  "custom_unit",
  "tracking_method",
  "concentration",
  "expiry_date",
  "safety_classification",
  "condition",
  "serial_number",
  "model",
  "notes",
] as const;

type ItemDraft = {
  item_type: LabItemType | null;
  item_name: string;
  category: string;
  quantity: string;
  unit: string;
  custom_unit: string;
  storage_location: string;
  minimum_stock_level: string;
  tracking_method: "quantity" | "individual";
  concentration: string;
  expiry_date: string;
  safety_classification: string;
  condition: string;
  serial_number: string;
  model: string;
  notes: string;
  submission_id: string;
};

type ItemPayload = {
  item_type: LabItemType;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  custom_unit?: string;
  storage_location: string;
  storage_location_id?: string;
  minimum_stock_level: number;
  tracking_method: "quantity" | "individual";
  concentration?: string;
  expiry_date?: string;
  safety_classification?: string;
  condition?: string;
  serial_number?: string;
  model?: string;
  notes?: string;
  submission_id: string;
  duplicate_action: "check" | "add_stock" | "create_separate";
};

type DuplicateItem = Pick<
  LabInventoryItem,
  "id" | "item_source" | "item_name" | "item_type" | "category" | "quantity_available" | "unit" | "storage_location"
>;

type CreateItemResponse = LaboratoryActionResponse<{
  duplicate: boolean;
  added_to_existing?: boolean;
  existing_item?: DuplicateItem;
  item?: LabInventoryItem;
  submission_id?: string;
}>;

type StockVariables = {
  item: LabInventoryItem;
  quantity_added: number;
  date_added?: string;
  notes?: string;
  submission_id: string;
};

type LocationDraft = {
  laboratory_or_store: string;
  room_or_section: string;
  cupboard_or_cabinet: string;
  shelf: string;
};

type ImportItemPayload = Omit<ItemPayload, "submission_id" | "duplicate_action"> & {
  source_row: number;
};

type ImportPreviewRow = {
  row: number;
  raw: Record<string, string>;
  item: ImportItemPayload;
  errors: string[];
  warnings: string[];
};

type ImportResultRow = {
  row: number;
  status: "imported" | "duplicate" | "failed";
  message: string;
  item?: unknown;
};

type ImportResponse = LaboratoryActionResponse<{
  imported_count: number;
  duplicate_count: number;
  failed_count: number;
  results: ImportResultRow[];
}>;

type ImportVariables = {
  submission_id: string;
  items: ImportItemPayload[];
};

function emptyItemDraft(): ItemDraft {
  return {
    item_type: null,
    item_name: "",
    category: "",
    quantity: "",
    unit: "Pieces",
    custom_unit: "",
    storage_location: "",
    minimum_stock_level: "",
    tracking_method: "quantity",
    concentration: "",
    expiry_date: "",
    safety_classification: "",
    condition: "Serviceable",
    serial_number: "",
    model: "",
    notes: "",
    submission_id: createSubmissionId("lab-item"),
  };
}

function emptyLocationDraft(): LocationDraft {
  return { laboratory_or_store: "", room_or_section: "", cupboard_or_cabinet: "", shelf: "" };
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").replace(/(es|s)$/, "");
}

function normalizeCsvHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseCsv(value: string) {
  const rows: Array<{ cells: string[]; row: number }> = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let physicalRow = 1;
  let rowStartedAt = 1;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const next = value[index + 1];
    if (character === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (character === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (character === "\n" || character === "\r") {
      if (character === "\r" && next === "\n") index += 1;
      if (quoted) {
        cell += "\n";
        physicalRow += 1;
        continue;
      }
      row.push(cell.trim());
      if (row.some((entry) => entry.length > 0)) rows.push({ cells: row, row: rowStartedAt });
      row = [];
      cell = "";
      physicalRow += 1;
      rowStartedAt = physicalRow;
      continue;
    }
    cell += character;
  }
  if (quoted) throw new Error("The CSV contains an unfinished quoted value.");
  row.push(cell.trim());
  if (row.some((entry) => entry.length > 0)) rows.push({ cells: row, row: rowStartedAt });
  return rows;
}

function normalizeImportedItemType(value: string): LabItemType | null {
  const normalized = value.trim().toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_+|_+$/g, "");
  if (["chemical", "chemical_or_reagent", "reagent"].includes(normalized)) return "chemical";
  if (["apparatus", "equipment", "apparatus_or_equipment"].includes(normalized)) return "apparatus";
  if (["consumable", "consumables"].includes(normalized)) return "consumable";
  if (["safety_equipment", "safety"].includes(normalized)) return "safety_equipment";
  return null;
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadCsvFile(filename: string, rows: Array<Array<unknown>>) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function recommendedTracking(name: string, itemType: LabItemType | null): "quantity" | "individual" {
  if (itemType !== "apparatus") return "quantity";
  const expensiveOrSensitive = [
    "microscope",
    "electronic balance",
    "centrifuge",
    "laboratory computer",
    "spectrometer",
    "data logger",
  ];
  return expensiveOrSensitive.some((item) => name.toLowerCase().includes(item)) ? "individual" : "quantity";
}

function todayKenyan() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

function pickerDateToKenyan(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function Field({
  label,
  required,
  help,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-bold text-[#071D49]">
      <span>{label}{required ? <span className="text-rose-700"> *</span> : null}</span>
      <span className="mt-1.5 block">{children}</span>
      {help ? <span className="mt-1 block text-xs font-medium leading-5 text-[#64748B]">{help}</span> : null}
      {error ? <span role="alert" className="mt-1 block text-xs font-bold text-rose-700">{error}</span> : null}
    </label>
  );
}

const inputClass = "min-h-11 w-full rounded-xl border border-[#C8D5EA] bg-white px-3 text-sm font-semibold text-[#071D49] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

const itemKinds: Array<{
  type: LabItemType;
  label: string;
  example: string;
  icon: typeof FlaskConical;
}> = [
  { type: "chemical", label: "Chemical or Reagent", example: "Acids, indicators and salts", icon: FlaskConical },
  { type: "apparatus", label: "Apparatus or Equipment", example: "Beakers, microscopes and balances", icon: Beaker },
  { type: "consumable", label: "Consumable", example: "Gloves, filter paper and cotton wool", icon: Boxes },
  { type: "safety_equipment", label: "Safety Equipment", example: "Goggles, coats and fire extinguishers", icon: Glasses },
];

const itemCategoryDefaults: Record<LabItemType, string> = {
  chemical: "Chemicals and Reagents",
  apparatus: "Apparatus and Equipment",
  consumable: "Consumables",
  safety_equipment: "Safety Equipment",
};

function itemTypeLabel(type: LabItemType) {
  return itemKinds.find((item) => item.type === type)?.label ?? type;
}

export function LabInventoryWorkspace() {
  const searchParams = useSearchParams();
  const scopedTenantId = useOptionalSchoolTenantId();
  const activeSchoolId = (scopedTenantId || getCurrentSchoolId()).trim();
  const activeUserId = useOptionalAuth()?.user?.id?.trim() ?? "";
  const itemDraftKey = activeSchoolId && activeUserId
    ? `${ITEM_DRAFT_KEY}:${activeSchoolId}:${activeUserId}`
    : null;
  const inventoryQuery = useSchoolQuery<LabInventoryData>("/labs/inventory");
  const locationsQuery = useSchoolQuery<LabStorageLocation[]>("/labs/locations");
  const items = inventoryQuery.data?.items ?? [];
  const locations = locationsQuery.data ?? inventoryQuery.data?.locations ?? [];
  const handledAction = useRef(false);
  const importFileInput = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState("All");
  const [stockPage, setStockPage] = useState(1);
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [itemStage, setItemStage] = useState<"type" | "details">("type");
  const [itemDraft, setItemDraft] = useState<ItemDraft>(() => emptyItemDraft());
  const [itemErrors, setItemErrors] = useState<Partial<Record<keyof ItemDraft, string>>>({});
  const [duplicateItem, setDuplicateItem] = useState<DuplicateItem | null>(null);
  const [locationFormOpen, setLocationFormOpen] = useState(false);
  const [locationDraft, setLocationDraft] = useState<LocationDraft>(() => emptyLocationDraft());
  const [locationError, setLocationError] = useState<string | null>(null);
  const [stockFormOpen, setStockFormOpen] = useState(false);
  const [stockItemId, setStockItemId] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [stockDate, setStockDate] = useState(todayKenyan);
  const [stockNotes, setStockNotes] = useState("");
  const [stockSubmissionId, setStockSubmissionId] = useState(() => createSubmissionId("lab-stock"));
  const [saveState, setSaveState] = useState<"saved" | "saving" | "failed" | "pending_sync" | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [loadedDraftKey, setLoadedDraftKey] = useState<string | null>(null);
  const [draftStored, setDraftStored] = useState(false);
  const [trackingManuallySet, setTrackingManuallySet] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importRows, setImportRows] = useState<ImportPreviewRow[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSubmissionId, setImportSubmissionId] = useState(() => createSubmissionId("lab-stock-import"));
  const [importSaveState, setImportSaveState] = useState<"saved" | "saving" | "failed" | "pending_sync" | null>(null);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);

  const createItemMutation = useLaboratoryMutation<CreateItemResponse, ItemPayload>({
    action: "add-laboratory-item",
    path: "/labs/items",
    body: (payload) => ({ ...payload }),
  });
  const addStockMutation = useLaboratoryMutation<LaboratoryActionResponse<{ item: LabInventoryItem }>, StockVariables>({
    action: "add-laboratory-stock",
    path: ({ item }) => `/labs/items/${item.item_source}/${item.id}/stock`,
    body: ({ quantity_added, date_added, notes, submission_id }) => ({ quantity_added, date_added, notes, submission_id }),
  });
  const createLocationMutation = useLaboratoryMutation<
    LaboratoryActionResponse<{ location: LabStorageLocation }>,
    LocationDraft
  >({
    action: "add-laboratory-location",
    path: "/labs/locations",
    body: (payload) => ({ ...payload }),
  });
  const importMutation = useLaboratoryMutation<ImportResponse, ImportVariables>({
    action: "import-laboratory-stock-list",
    path: "/labs/items/import",
    body: ({ submission_id, items: importItems }) => ({ submission_id, items: importItems }),
  });

  useEffect(() => {
    setLoadedDraftKey(null);
    setDraftStored(false);
    setItemDraft(emptyItemDraft());
    if (!itemDraftKey) return;
    try {
      const stored = window.localStorage.getItem(itemDraftKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ItemDraft>;
        if (parsed.item_name || parsed.item_type) {
          setItemDraft((current) => ({ ...current, ...parsed, submission_id: parsed.submission_id || current.submission_id }));
        }
      }
    } catch {
      window.localStorage.removeItem(itemDraftKey);
    } finally {
      setLoadedDraftKey(itemDraftKey);
    }
  }, [itemDraftKey]);

  useEffect(() => {
    if (!itemDraftKey || loadedDraftKey !== itemDraftKey || !itemFormOpen) return;
    window.localStorage.setItem(itemDraftKey, JSON.stringify(itemDraft));
    setDraftStored(true);
  }, [itemDraft, itemDraftKey, itemFormOpen, loadedDraftKey]);

  useEffect(() => {
    if (!importOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !importMutation.isPending) setImportOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [importMutation.isPending, importOpen]);

  useEffect(() => {
    if (handledAction.current) return;
    handledAction.current = true;
    const action = searchParams.get("action");
    if (action === "add-item") {
      const requestedType = searchParams.get("type");
      const validType = itemKinds.some((item) => item.type === requestedType)
        ? requestedType as LabItemType
        : null;
      setItemFormOpen(true);
      if (validType) {
        setItemDraft((current) => ({
          ...current,
          item_type: validType,
          category: current.item_type === validType && current.category
            ? current.category
            : itemCategoryDefaults[validType],
          tracking_method: recommendedTracking(current.item_name, validType),
        }));
        setTrackingManuallySet(false);
        setItemStage("details");
      } else {
        setItemStage(itemDraft.item_type ? "details" : "type");
      }
    }
    if (action === "add-stock") setStockFormOpen(true);
    if (action === "import") setImportOpen(true);
  }, [itemDraft.item_type, searchParams]);

  const categories = useMemo(
    () => [...new Set(items.map((item) => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [items],
  );
  const statusOptions = useMemo(
    () => ["All", ...new Set(items.map((item) => item.status))],
    [items],
  );
  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus = statusFilter === "All" || item.status === statusFilter;
      const matchesSearch = !needle || [item.item_name, item.category, item.storage_location, item.unit]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
      return matchesStatus && matchesSearch;
    });
  }, [items, search, statusFilter]);
  const stockPageCount = Math.max(1, Math.ceil(filteredItems.length / STOCK_PAGE_SIZE));
  const currentStockPage = Math.min(stockPage, stockPageCount);
  const stockPageStart = (currentStockPage - 1) * STOCK_PAGE_SIZE;
  const pagedItems = filteredItems.slice(stockPageStart, stockPageStart + STOCK_PAGE_SIZE);
  const selectedStockItem = items.find((item) => item.id === stockItemId) ?? null;

  useEffect(() => {
    if (stockPage > stockPageCount) setStockPage(stockPageCount);
  }, [stockPage, stockPageCount]);

  function openAddItem() {
    setConfirmation(null);
    setDuplicateItem(null);
    setItemErrors({});
    setItemFormOpen(true);
    setItemStage(itemDraft.item_type ? "details" : "type");
    setSaveState(null);
  }

  function selectItemType(type: LabItemType) {
    setItemDraft((current) => ({
      ...current,
      item_type: type,
      category: current.category || itemCategoryDefaults[type],
      tracking_method: recommendedTracking(current.item_name, type),
    }));
    setTrackingManuallySet(false);
    setItemStage("details");
  }

  function changeItemName(value: string) {
    const existing = items.find((item) => normalizeName(item.item_name) === normalizeName(value));
    setItemDraft((current) => ({
      ...current,
      item_name: value,
      category: existing?.category ?? current.category,
      unit: existing?.unit
        ? LAB_UNITS.includes(existing.unit as (typeof LAB_UNITS)[number]) ? existing.unit : "Custom"
        : current.unit,
      custom_unit: existing?.unit && !LAB_UNITS.includes(existing.unit as (typeof LAB_UNITS)[number]) ? existing.unit : current.custom_unit,
      storage_location: existing?.storage_location ?? current.storage_location,
      tracking_method: trackingManuallySet ? current.tracking_method : recommendedTracking(value, current.item_type),
    }));
    setDuplicateItem(null);
    setItemErrors((current) => ({ ...current, item_name: undefined }));
  }

  function validateItem() {
    const errors: Partial<Record<keyof ItemDraft, string>> = {};
    if (!itemDraft.item_type) errors.item_type = "Choose what you are adding.";
    if (!itemDraft.item_name.trim()) errors.item_name = "Enter the ordinary name used in the laboratory.";
    if (!itemDraft.category.trim()) errors.category = "Enter or choose a category.";
    if (itemDraft.quantity === "" || Number(itemDraft.quantity) < 0) errors.quantity = "Enter a quantity of zero or more.";
    if (!itemDraft.unit) errors.unit = "Choose a unit.";
    if (itemDraft.unit === "Custom" && !itemDraft.custom_unit.trim()) errors.custom_unit = "Enter the custom unit.";
    if (!itemDraft.storage_location.trim()) errors.storage_location = "Say where this item is stored.";
    if (itemDraft.minimum_stock_level === "" || Number(itemDraft.minimum_stock_level) < 0) {
      errors.minimum_stock_level = "Enter the quantity at which MyShule should warn you.";
    }
    if (itemDraft.tracking_method === "individual" && !itemDraft.condition.trim()) {
      errors.condition = "Select the equipment condition.";
    }
    setItemErrors(errors);
    const first = Object.keys(errors)[0];
    if (first) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus());
      return false;
    }
    return true;
  }

  function buildItemPayload(duplicateAction: ItemPayload["duplicate_action"]): ItemPayload | null {
    if (!itemDraft.item_type || !validateItem()) return null;
    const location = locations.find((entry) => entry.full_path.toLowerCase() === itemDraft.storage_location.trim().toLowerCase());
    return {
      item_type: itemDraft.item_type,
      item_name: itemDraft.item_name.trim(),
      category: itemDraft.category.trim(),
      quantity: Number(itemDraft.quantity),
      unit: itemDraft.unit,
      ...(itemDraft.unit === "Custom" ? { custom_unit: itemDraft.custom_unit.trim() } : {}),
      storage_location: itemDraft.storage_location.trim(),
      ...(location ? { storage_location_id: location.id } : {}),
      minimum_stock_level: Number(itemDraft.minimum_stock_level),
      tracking_method: itemDraft.tracking_method,
      ...(itemDraft.concentration.trim() ? { concentration: itemDraft.concentration.trim() } : {}),
      ...(itemDraft.expiry_date.trim() ? { expiry_date: itemDraft.expiry_date.trim() } : {}),
      ...(itemDraft.safety_classification.trim() ? { safety_classification: itemDraft.safety_classification.trim() } : {}),
      ...(itemDraft.condition.trim() ? { condition: itemDraft.condition.trim() } : {}),
      ...(itemDraft.serial_number.trim() ? { serial_number: itemDraft.serial_number.trim() } : {}),
      ...(itemDraft.model.trim() ? { model: itemDraft.model.trim() } : {}),
      ...(itemDraft.notes.trim() ? { notes: itemDraft.notes.trim() } : {}),
      submission_id: itemDraft.submission_id,
      duplicate_action: duplicateAction,
    };
  }

  async function submitItem(duplicateAction: ItemPayload["duplicate_action"] = "check") {
    const payload = buildItemPayload(duplicateAction);
    if (!payload) return;
    setSaveState("saving");
    try {
      const response = await createItemMutation.mutateAsync(payload);
      if (isPendingSync(response)) {
        setSaveState("pending_sync");
        toast.warning("This item is pending sync. MyShule has not added it to the school stock book yet.");
        return;
      }
      if (response.duplicate && response.existing_item) {
        setDuplicateItem(response.existing_item);
        if (response.submission_id && response.submission_id !== itemDraft.submission_id) {
          setItemDraft((current) => ({ ...current, submission_id: response.submission_id! }));
        }
        setSaveState(null);
        return;
      }
      setSaveState("saved");
      setConfirmation(response.message);
      toast.success(response.message);
      setDuplicateItem(null);
      setItemFormOpen(false);
      setItemStage("type");
      setItemDraft(emptyItemDraft());
      setTrackingManuallySet(false);
      setDraftStored(false);
      if (itemDraftKey) window.localStorage.removeItem(itemDraftKey);
      await Promise.all([inventoryQuery.refetch(), locationsQuery.refetch()]);
    } catch (error) {
      setSaveState("failed");
      toast.error(error instanceof Error ? error.message : "The item could not be added. Your entries are still here.");
    }
  }

  function viewDuplicate(item: DuplicateItem) {
    setSearch(item.item_name);
    setStatusFilter("All");
    setStockPage(1);
    setItemFormOpen(false);
    requestAnimationFrame(() => document.getElementById("lab-stock-list")?.scrollIntoView({ behavior: "smooth" }));
  }

  async function createLocation() {
    if (!locationDraft.laboratory_or_store.trim()) {
      setLocationError("Enter the laboratory or store name.");
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[name="laboratory_or_store"]')?.focus());
      return;
    }
    setLocationError(null);
    setSaveState("saving");
    try {
      const response = await createLocationMutation.mutateAsync(locationDraft);
      if (isPendingSync(response)) {
        setSaveState("pending_sync");
        toast.warning("This location is pending sync and cannot be selected until the server confirms it.");
        return;
      }
      setItemDraft((current) => ({ ...current, storage_location: response.location.full_path }));
      setLocationDraft(emptyLocationDraft());
      setLocationFormOpen(false);
      setSaveState("saved");
      toast.success(response.message);
      await locationsQuery.refetch();
    } catch (error) {
      setSaveState("failed");
      setLocationError(error instanceof Error ? error.message : "The storage location could not be added.");
    }
  }

  async function addStock() {
    if (!selectedStockItem) {
      toast.error("Choose the item receiving stock.");
      return;
    }
    if (!stockQuantity || Number(stockQuantity) <= 0) {
      toast.error("Enter a quantity greater than zero.");
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[name="quantity_added"]')?.focus());
      return;
    }
    setSaveState("saving");
    try {
      const response = await addStockMutation.mutateAsync({
        item: selectedStockItem,
        quantity_added: Number(stockQuantity),
        date_added: stockDate || undefined,
        notes: stockNotes.trim() || undefined,
        submission_id: stockSubmissionId,
      });
      if (isPendingSync(response)) {
        setSaveState("pending_sync");
        toast.warning("This stock entry is pending sync. The available quantity has not been confirmed yet.");
        return;
      }
      setSaveState("saved");
      setConfirmation(response.message);
      toast.success(response.message);
      setStockFormOpen(false);
      setStockItemId("");
      setStockQuantity("");
      setStockDate(todayKenyan());
      setStockNotes("");
      setStockSubmissionId(createSubmissionId("lab-stock"));
      await inventoryQuery.refetch();
    } catch (error) {
      setSaveState("failed");
      toast.error(error instanceof Error ? error.message : "Stock could not be added. Your entries are still here.");
    }
  }

  async function readImportFile(file: File | undefined) {
    if (!file) return;
    setImportError(null);
    setImportResult(null);
    setImportSaveState(null);
    setImportFileName(file.name);
    setImportSubmissionId(createSubmissionId("lab-stock-import"));
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setImportRows([]);
      setImportError("Choose a CSV file. Other file types are not accepted for the laboratory stock list.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setImportRows([]);
      setImportError("This CSV is larger than 2 MB. Split it into smaller stock lists and try again.");
      return;
    }

    try {
      const parsed = parseCsv(await file.text());
      if (parsed.length < 2) {
        setImportRows([]);
        setImportError("The CSV has no item rows. Keep the heading row and add at least one laboratory item.");
        return;
      }
      const headers = parsed[0].cells.map(normalizeCsvHeader);
      const missing = CSV_REQUIRED_HEADERS.filter((header) => !headers.includes(header));
      if (missing.length) {
        setImportRows([]);
        setImportError(`Add these required columns: ${missing.join(", ")}.`);
        return;
      }
      const dataRows = parsed.slice(1);
      if (dataRows.length > 250) {
        setImportRows([]);
        setImportError("Import up to 250 item rows at a time. Split this stock list into smaller CSV files.");
        return;
      }

      const seen = new Set<string>();
      const preview = dataRows.map(({ cells, row: sourceRow }): ImportPreviewRow => {
        const raw = Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex]?.trim() ?? ""]));
        const errors: string[] = [];
        const warnings: string[] = [];
        const itemType = normalizeImportedItemType(raw.item_type);
        const quantity = Number(raw.quantity);
        const minimumStockLevel = Number(raw.minimum_stock_level);
        const knownUnit = LAB_UNITS.find((unit) => unit.toLowerCase() === raw.unit.toLowerCase());
        const unit = knownUnit && knownUnit !== "Custom" ? knownUnit : raw.unit ? "Custom" : "Pieces";
        const customUnit = knownUnit === "Custom" ? raw.custom_unit : knownUnit ? "" : raw.unit;
        const tracking = (raw.tracking_method ?? "").trim().toLowerCase();

        if (!raw.item_name) errors.push("Item Name is required.");
        if (!itemType) errors.push("Item Type must be chemical, apparatus, consumable, or safety equipment.");
        if (!raw.category) errors.push("Category is required.");
        if (!raw.quantity || !Number.isFinite(quantity) || quantity < 0) errors.push("Quantity must be zero or more.");
        if (!raw.unit) errors.push("Unit is required.");
        if (unit === "Custom" && !customUnit) errors.push("Enter custom_unit when Unit is Custom.");
        if (!raw.storage_location) errors.push("Storage Location is required.");
        if (!raw.minimum_stock_level || !Number.isFinite(minimumStockLevel) || minimumStockLevel < 0) {
          errors.push("Minimum Stock Level must be zero or more.");
        }
        if (tracking && !["quantity", "individual"].includes(tracking)) {
          errors.push("Tracking Method must be quantity or individual.");
        }

        const duplicateKey = `${normalizeName(raw.item_name)}:${raw.storage_location.toLowerCase()}`;
        const existing = items.find(
          (item) => normalizeName(item.item_name) === normalizeName(raw.item_name)
            && (item.storage_location ?? "").toLowerCase() === raw.storage_location.toLowerCase(),
        );
        if (existing) warnings.push(`${existing.item_name} already exists at this storage location; the server will mark it for review.`);
        if (seen.has(duplicateKey)) warnings.push("Another row in this CSV has the same item name and storage location.");
        seen.add(duplicateKey);

        const storageLocation = locations.find(
          (location) => location.full_path.toLowerCase() === raw.storage_location.toLowerCase(),
        );
        const normalizedType = itemType ?? "apparatus";
        return {
          row: sourceRow,
          raw,
          errors,
          warnings,
          item: {
            source_row: sourceRow,
            item_type: normalizedType,
            item_name: raw.item_name,
            category: raw.category,
            quantity: Number.isFinite(quantity) ? quantity : 0,
            unit,
            ...(customUnit ? { custom_unit: customUnit } : {}),
            storage_location: raw.storage_location,
            ...(storageLocation ? { storage_location_id: storageLocation.id } : {}),
            minimum_stock_level: Number.isFinite(minimumStockLevel) ? minimumStockLevel : 0,
            tracking_method: tracking === "individual"
              ? "individual"
              : tracking === "quantity"
                ? "quantity"
                : recommendedTracking(raw.item_name, normalizedType),
            ...(raw.concentration ? { concentration: raw.concentration } : {}),
            ...(raw.expiry_date ? { expiry_date: raw.expiry_date } : {}),
            ...(raw.safety_classification ? { safety_classification: raw.safety_classification } : {}),
            ...(raw.condition ? { condition: raw.condition } : {}),
            ...(raw.serial_number ? { serial_number: raw.serial_number } : {}),
            ...(raw.model ? { model: raw.model } : {}),
            ...(raw.notes ? { notes: raw.notes } : {}),
          },
        };
      });
      setImportRows(preview);
    } catch (error) {
      setImportRows([]);
      setImportError(error instanceof Error ? error.message : "The CSV could not be read.");
    } finally {
      if (importFileInput.current) importFileInput.current.value = "";
    }
  }

  async function submitStockList() {
    const validRows = importRows.filter((row) => row.errors.length === 0);
    const invalidRows = importRows.filter((row) => row.errors.length > 0);
    if (!validRows.length) {
      setImportSaveState("failed");
      setImportError("No valid item rows are ready to import. Correct the highlighted rows and choose the CSV again.");
      return;
    }
    setImportError(null);
    setImportSaveState("saving");
    try {
      const response = await importMutation.mutateAsync({
        submission_id: importSubmissionId,
        items: validRows.map((row) => row.item),
      });
      if (isPendingSync(response)) {
        setImportSaveState("pending_sync");
        toast.warning("This stock list is pending sync. No imported quantities are confirmed yet.");
        return;
      }

      const clientFailures: ImportResultRow[] = invalidRows.map((row) => ({
        row: row.row,
        status: "failed",
        message: row.errors.join(" "),
      }));
      const results = [...response.results, ...clientFailures].sort((left, right) => left.row - right.row);
      const importedCount = response.imported_count;
      const duplicateCount = response.duplicate_count;
      const failedCount = response.failed_count + clientFailures.length;
      const finalResult: ImportResponse = {
        ...response,
        imported_count: importedCount,
        duplicate_count: duplicateCount,
        failed_count: failedCount,
        results,
        message: `Stock list checked. ${importedCount} ${importedCount === 1 ? "item was" : "items were"} added, ${duplicateCount} possible ${duplicateCount === 1 ? "duplicate needs" : "duplicates need"} review, and ${failedCount} ${failedCount === 1 ? "row failed" : "rows failed"}.`,
      };
      setImportResult(finalResult);
      setImportSaveState("saved");
      if (duplicateCount || failedCount) toast.warning(finalResult.message);
      else toast.success(finalResult.message);
      await inventoryQuery.refetch();
    } catch (error) {
      setImportSaveState("failed");
      setImportError(error instanceof Error ? error.message : "The stock list could not be imported. Your preview is still here.");
    }
  }

  function downloadImportTemplate() {
    downloadCsvFile("laboratory-stock-list-template.csv", [[...CSV_REQUIRED_HEADERS, ...CSV_OPTIONAL_HEADERS]]);
  }

  function downloadImportErrors() {
    const resultFailures = importResult?.results.filter((row) => row.status === "failed") ?? [];
    const previewFailures = importResult
      ? []
      : importRows
          .filter((row) => row.errors.length)
          .map((row) => ({ row: row.row, status: "failed" as const, message: row.errors.join(" ") }));
    const failures = [...resultFailures, ...previewFailures];
    downloadCsvFile(
      "laboratory-stock-list-errors.csv",
      [
        ["row", "item_name", "status", "message"],
        ...failures.map((failure) => [
          failure.row,
          importRows.find((row) => row.row === failure.row)?.raw.item_name ?? "",
          failure.status,
          failure.message,
        ]),
      ],
    );
  }

  function clearImport() {
    setImportFileName("");
    setImportRows([]);
    setImportError(null);
    setImportResult(null);
    setImportSaveState(null);
    setImportSubmissionId(createSubmissionId("lab-stock-import"));
  }

  return (
    <div className="space-y-5">
      <Panel
        title="Laboratory Stock Book"
        description="Find an item, add ordinary stock quickly, and see what is low, missing, damaged, or expired."
        icon={Boxes}
      >
        <LabQuickActions />
      </Panel>

      {confirmation ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-800">
          {confirmation}
        </div>
      ) : null}
      {inventoryQuery.error ? (
        <WorkspaceError
          message="The stock book could not be loaded. Check the connection and retry; no stock has been changed."
          onRetry={() => void inventoryQuery.refetch()}
        />
      ) : null}

      {itemFormOpen ? (
        <Panel
          title={itemStage === "type" ? "What Are You Adding?" : `Add ${itemDraft.item_type ? itemTypeLabel(itemDraft.item_type) : "Item"}`}
          description={itemStage === "type" ? "Choose the school laboratory item type. You will only see fields that apply." : "Required details come first. More details are optional."}
          icon={PackagePlus}
          actions={(
            <button
              type="button"
              aria-label="Close Add Item form"
              onClick={() => setItemFormOpen(false)}
              className="grid h-11 w-11 place-items-center rounded-xl border border-[#C8D5EA] text-[#071D49]"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        >
          {itemStage === "type" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {itemKinds.map(({ type, label, example, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  name="item_type"
                  onClick={() => selectItemType(type)}
                  className="flex min-h-28 items-start gap-4 rounded-2xl border border-[#C8D5EA] bg-white p-4 text-left transition hover:border-blue-500 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-black text-[#071D49]">{label}</span>
                    <span className="mt-1 block text-sm leading-6 text-[#64748B]">{example}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={(event) => { event.preventDefault(); void submitItem(); }} noValidate>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm font-bold text-blue-900">Adding: {itemDraft.item_type ? itemTypeLabel(itemDraft.item_type) : "Item"}</p>
                <button type="button" onClick={() => setItemStage("type")} className="min-h-10 rounded-lg border border-blue-300 bg-white px-3 text-sm font-black text-blue-800">
                  Change Type
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Item Name" required error={itemErrors.item_name}>
                  <input
                    name="item_name"
                    list="laboratory-item-names"
                    autoFocus
                    autoComplete="off"
                    value={itemDraft.item_name}
                    onChange={(event) => changeItemName(event.target.value)}
                    placeholder="For example, Test tubes"
                    className={inputClass}
                  />
                </Field>
                <datalist id="laboratory-item-names">
                  {items.map((item) => <option key={`${item.item_source}:${item.id}`} value={item.item_name} />)}
                </datalist>

                <Field label="Category" required error={itemErrors.category}>
                  <input
                    name="category"
                    list="laboratory-categories"
                    value={itemDraft.category}
                    onChange={(event) => setItemDraft((current) => ({ ...current, category: event.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <datalist id="laboratory-categories">
                  {categories.map((category) => <option key={category} value={category} />)}
                </datalist>

                <Field label="Quantity" required error={itemErrors.quantity}>
                  <input
                    name="quantity"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={itemDraft.quantity}
                    onChange={(event) => setItemDraft((current) => ({ ...current, quantity: event.target.value }))}
                    placeholder="0"
                    className={inputClass}
                  />
                </Field>

                <Field label="Unit" required error={itemErrors.unit}>
                  <select
                    name="unit"
                    value={itemDraft.unit}
                    onChange={(event) => setItemDraft((current) => ({ ...current, unit: event.target.value }))}
                    className={inputClass}
                  >
                    {LAB_UNITS.map((unit) => <option key={unit}>{unit}</option>)}
                  </select>
                </Field>

                {itemDraft.unit === "Custom" ? (
                  <Field label="Custom Unit" required error={itemErrors.custom_unit}>
                    <input
                      name="custom_unit"
                      value={itemDraft.custom_unit}
                      onChange={(event) => setItemDraft((current) => ({ ...current, custom_unit: event.target.value }))}
                      placeholder="For example, Trays"
                      className={inputClass}
                    />
                  </Field>
                ) : null}

                <div>
                  <Field label="Where Is It Stored?" required error={itemErrors.storage_location}>
                    <input
                      name="storage_location"
                      list="laboratory-locations"
                      value={itemDraft.storage_location}
                      onChange={(event) => setItemDraft((current) => ({ ...current, storage_location: event.target.value }))}
                      placeholder="Chemistry Laboratory → Cupboard 2"
                      className={inputClass}
                    />
                  </Field>
                  <datalist id="laboratory-locations">
                    {locations.map((location) => <option key={location.id} value={location.full_path} />)}
                  </datalist>
                  <button
                    type="button"
                    onClick={() => setLocationFormOpen((open) => !open)}
                    className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-black text-blue-700 hover:bg-blue-50"
                  >
                    <MapPinPlus className="h-4 w-4" aria-hidden="true" /> Add New Location
                  </button>
                </div>

                <Field
                  label="Minimum Quantity"
                  required
                  error={itemErrors.minimum_stock_level}
                  help="This is the level at which MyShule should warn you that stock is running low."
                >
                  <input
                    name="minimum_stock_level"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={itemDraft.minimum_stock_level}
                    onChange={(event) => setItemDraft((current) => ({ ...current, minimum_stock_level: event.target.value }))}
                    placeholder="0"
                    className={inputClass}
                  />
                </Field>
              </div>

              {locationFormOpen ? (
                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-blue-950">Add New Location</p>
                      <p className="mt-1 text-sm text-blue-800">Build the location in the same order you walk through the laboratory.</p>
                    </div>
                    <button type="button" aria-label="Close location form" onClick={() => setLocationFormOpen(false)} className="grid h-10 w-10 place-items-center rounded-lg bg-white text-blue-900">
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Field label="Laboratory or Store" required error={locationError ?? undefined}>
                      <input name="laboratory_or_store" value={locationDraft.laboratory_or_store} onChange={(event) => setLocationDraft((current) => ({ ...current, laboratory_or_store: event.target.value }))} placeholder="Chemistry Laboratory" className={inputClass} />
                    </Field>
                    <Field label="Room or Section">
                      <input value={locationDraft.room_or_section} onChange={(event) => setLocationDraft((current) => ({ ...current, room_or_section: event.target.value }))} placeholder="Chemical Store" className={inputClass} />
                    </Field>
                    <Field label="Cupboard or Cabinet">
                      <input value={locationDraft.cupboard_or_cabinet} onChange={(event) => setLocationDraft((current) => ({ ...current, cupboard_or_cabinet: event.target.value }))} placeholder="Cabinet B" className={inputClass} />
                    </Field>
                    <Field label="Shelf">
                      <input value={locationDraft.shelf} onChange={(event) => setLocationDraft((current) => ({ ...current, shelf: event.target.value }))} placeholder="Shelf 2" className={inputClass} />
                    </Field>
                  </div>
                  <button type="button" disabled={createLocationMutation.isPending} onClick={() => void createLocation()} className="mt-4 min-h-11 rounded-xl bg-blue-900 px-4 text-sm font-black text-white disabled:opacity-60">
                    {createLocationMutation.isPending ? "Adding Location…" : "Add Location"}
                  </button>
                </div>
              ) : null}

              {itemDraft.item_type === "chemical" ? (
                <div className="mt-4 grid gap-4 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 md:grid-cols-3">
                  <Field label="Concentration">
                    <input value={itemDraft.concentration} onChange={(event) => setItemDraft((current) => ({ ...current, concentration: event.target.value }))} placeholder="For example, 0.1 M" className={inputClass} />
                  </Field>
                  <Field label="Expiry Date" help="Type DD/MM/YYYY or choose a date.">
                    <div className="flex gap-2">
                      <input name="expiry_date" inputMode="numeric" value={itemDraft.expiry_date} onChange={(event) => setItemDraft((current) => ({ ...current, expiry_date: event.target.value }))} placeholder="DD/MM/YYYY" className={inputClass} />
                      <input type="date" aria-label="Choose expiry date" onChange={(event) => setItemDraft((current) => ({ ...current, expiry_date: pickerDateToKenyan(event.target.value) }))} className="h-11 w-12 rounded-xl border border-[#C8D5EA] bg-white p-2" />
                    </div>
                  </Field>
                  <Field label="Safety Classification">
                    <select value={itemDraft.safety_classification} onChange={(event) => setItemDraft((current) => ({ ...current, safety_classification: event.target.value }))} className={inputClass}>
                      <option value="">Choose if known</option>
                      <option>Corrosive</option><option>Flammable</option><option>Toxic</option><option>Irritant</option><option>Oxidising</option><option>Environmental Hazard</option><option>General Laboratory Chemical</option>
                    </select>
                  </Field>
                </div>
              ) : null}

              {itemDraft.item_type === "apparatus" ? (
                <div className="mt-4 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
                  <p className="text-sm font-black text-[#071D49]">How should this be tracked?</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <button type="button" onClick={() => { setTrackingManuallySet(true); setItemDraft((current) => ({ ...current, tracking_method: "quantity" })); }} className={cn("rounded-xl border p-3 text-left", itemDraft.tracking_method === "quantity" ? "border-blue-500 bg-blue-50" : "border-[#C8D5EA] bg-white")}>
                      <span className="block font-black text-[#071D49]">Track by Quantity</span>
                      <span className="mt-1 block text-xs leading-5 text-[#64748B]">Recommended for test tubes, beakers, funnels, slides and similar apparatus.</span>
                    </button>
                    <button type="button" onClick={() => { setTrackingManuallySet(true); setItemDraft((current) => ({ ...current, tracking_method: "individual" })); }} className={cn("rounded-xl border p-3 text-left", itemDraft.tracking_method === "individual" ? "border-blue-500 bg-blue-50" : "border-[#C8D5EA] bg-white")}>
                      <span className="block font-black text-[#071D49]">Track Individually</span>
                      <span className="mt-1 block text-xs leading-5 text-[#64748B]">Useful for microscopes, electronic balances and other sensitive equipment.</span>
                    </button>
                  </div>
                  {itemDraft.tracking_method === "individual" ? (
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <Field label="Condition" required error={itemErrors.condition}>
                        <select name="condition" value={itemDraft.condition} onChange={(event) => setItemDraft((current) => ({ ...current, condition: event.target.value }))} className={inputClass}>
                          <option>Serviceable</option><option>Needs Attention</option><option>Under Maintenance</option><option>Damaged</option>
                        </select>
                      </Field>
                      <Field label="Serial Number">
                        <input value={itemDraft.serial_number} onChange={(event) => setItemDraft((current) => ({ ...current, serial_number: event.target.value }))} placeholder="Optional" className={inputClass} />
                      </Field>
                      <Field label="Model">
                        <input value={itemDraft.model} onChange={(event) => setItemDraft((current) => ({ ...current, model: event.target.value }))} placeholder="Optional" className={inputClass} />
                      </Field>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <details className="mt-4 rounded-xl border border-[#D8E0EC] bg-white p-4">
                <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between font-black text-[#071D49]">
                  Add More Details <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </summary>
                <div className="mt-3">
                  <Field label="Notes">
                    <textarea value={itemDraft.notes} onChange={(event) => setItemDraft((current) => ({ ...current, notes: event.target.value }))} rows={3} placeholder="Optional laboratory note" className={`${inputClass} py-3`} />
                  </Field>
                </div>
              </details>

              {duplicateItem ? (
                <div role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
                    <div>
                      <p className="font-black text-amber-950">{duplicateItem.item_name} already exists in {duplicateItem.storage_location || "this laboratory"}.</p>
                      <p className="mt-1 text-sm leading-6 text-amber-900">Would you like to add {itemDraft.quantity} {duplicateItem.unit} to the existing stock?</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" disabled={createItemMutation.isPending} onClick={() => void submitItem("add_stock")} className="min-h-11 rounded-xl bg-amber-900 px-4 text-sm font-black text-white disabled:opacity-60">Add to Existing Stock</button>
                    <button type="button" onClick={() => viewDuplicate(duplicateItem)} className="min-h-11 rounded-xl border border-amber-400 bg-white px-4 text-sm font-black text-amber-900">View Existing Item</button>
                    <button type="button" disabled={createItemMutation.isPending} onClick={() => void submitItem("create_separate")} className="min-h-11 rounded-xl border border-amber-400 bg-white px-4 text-sm font-black text-amber-900 disabled:opacity-60">Create Separate Item</button>
                    <button type="button" onClick={() => setDuplicateItem(null)} className="min-h-11 rounded-xl px-4 text-sm font-black text-amber-900">Cancel</button>
                  </div>
                </div>
              ) : null}

              <div className="sticky bottom-0 z-10 -mx-5 mt-5 flex flex-col gap-3 border-t border-[#D8E0EC] bg-white/95 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <SaveState state={saveState} />
                  {draftStored && saveState !== "saved" ? <p className="text-xs font-semibold text-[#64748B]">Draft saved on this device.</p> : null}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setItemFormOpen(false)} className="min-h-12 rounded-xl border border-[#C8D5EA] px-4 text-sm font-black text-[#071D49]">Keep as Draft</button>
                  {!duplicateItem ? (
                    <button type="submit" disabled={createItemMutation.isPending} className="min-h-12 flex-1 rounded-xl bg-[#071D49] px-5 text-sm font-black text-white disabled:opacity-60 sm:flex-none">
                      {createItemMutation.isPending ? "Adding Item…" : "Add Item"}
                    </button>
                  ) : null}
                </div>
              </div>
            </form>
          )}
        </Panel>
      ) : null}

      {stockFormOpen ? (
        <Panel
          title="Add Stock"
          description="Choose the item, enter the quantity received, and confirm."
          icon={PackagePlus}
          actions={(
            <button type="button" aria-label="Close Add Stock form" onClick={() => setStockFormOpen(false)} className="grid h-11 w-11 place-items-center rounded-xl border border-[#C8D5EA] text-[#071D49]"><X className="h-5 w-5" aria-hidden="true" /></button>
          )}
        >
          <form onSubmit={(event) => { event.preventDefault(); void addStock(); }} className="grid gap-4 md:grid-cols-2">
            <Field label="Item" required>
              <select name="stock_item" autoFocus value={stockItemId} onChange={(event) => setStockItemId(event.target.value)} className={inputClass}>
                <option value="">Choose an item</option>
                {items.map((item) => <option key={`${item.item_source}:${item.id}`} value={item.id}>{item.item_name} · {item.quantity_available} {item.unit} available</option>)}
              </select>
            </Field>
            <Field label="Quantity Added" required help={selectedStockItem ? `Recorded in ${selectedStockItem.unit}.` : undefined}>
              <input name="quantity_added" type="number" inputMode="decimal" min="0.001" step="any" value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} placeholder="0" className={inputClass} />
            </Field>
            <Field label="Date Added" help="Type DD/MM/YYYY or choose a date.">
              <div className="flex gap-2">
                <input inputMode="numeric" value={stockDate} onChange={(event) => setStockDate(event.target.value)} placeholder="DD/MM/YYYY" className={inputClass} />
                <input type="date" aria-label="Choose date added" onChange={(event) => setStockDate(pickerDateToKenyan(event.target.value))} className="h-11 w-12 rounded-xl border border-[#C8D5EA] bg-white p-2" />
              </div>
            </Field>
            <Field label="Note">
              <input value={stockNotes} onChange={(event) => setStockNotes(event.target.value)} placeholder="Optional" className={inputClass} />
            </Field>
            <div className="md:col-span-2"><SaveState state={saveState} /></div>
            <div className="sticky bottom-0 z-10 -mx-5 flex justify-end border-t border-[#D8E0EC] bg-white/95 px-5 py-4 backdrop-blur md:col-span-2">
              <button type="submit" disabled={addStockMutation.isPending} className="min-h-12 w-full rounded-xl bg-[#071D49] px-5 text-sm font-black text-white disabled:opacity-60 sm:w-auto">
                {addStockMutation.isPending ? "Adding Stock…" : "Confirm Stock Added"}
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

      {importOpen ? (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-white sm:bg-slate-950/50 sm:p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-stock-list-title"
            className="mx-auto flex min-h-screen w-full max-w-5xl flex-col bg-white sm:min-h-0 sm:rounded-2xl sm:shadow-2xl"
          >
            <header className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-[#D8E0EC] bg-white px-4 py-4 sm:rounded-t-2xl sm:px-6">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
                  <FileUp className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="import-stock-list-title" className="text-xl font-black text-[#071D49]">Import Stock List</h2>
                  <p className="mt-1 text-sm leading-6 text-[#64748B]">Choose a CSV, check every item in the preview, then import the valid rows.</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close stock list import"
                disabled={importMutation.isPending}
                onClick={() => setImportOpen(false)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#C8D5EA] text-[#071D49] disabled:opacity-50"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            <div className="flex-1 space-y-5 px-4 py-5 sm:px-6">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="font-black text-blue-950">Required CSV columns</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CSV_REQUIRED_HEADERS.map((header) => (
                    <code key={header} className="rounded-lg border border-blue-200 bg-white px-2 py-1 text-xs font-bold text-blue-900">{header}</code>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-6 text-blue-900">
                  Item Type accepts chemical, apparatus, consumable, or safety equipment. Quantity and Minimum Stock Level may be zero or more. Import up to 250 item rows at a time.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => importFileInput.current?.click()}
                  className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#071D49] px-4 text-sm font-black text-white"
                >
                  <FileUp className="h-4 w-4" aria-hidden="true" /> {importFileName ? "Choose Another CSV" : "Choose CSV File"}
                </button>
                <button
                  type="button"
                  onClick={downloadImportTemplate}
                  className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-[#C8D5EA] px-4 text-sm font-black text-[#071D49]"
                >
                  <Download className="h-4 w-4" aria-hidden="true" /> Download Blank CSV Template
                </button>
                <input
                  ref={importFileInput}
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  aria-label="Choose laboratory stock list CSV"
                  onChange={(event) => void readImportFile(event.target.files?.[0])}
                />
              </div>

              {importFileName ? (
                <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] px-4 py-3 text-sm">
                  <span className="font-black text-[#071D49]">Selected file:</span> <span className="font-semibold text-[#64748B]">{importFileName}</span>
                </div>
              ) : null}

              {importError ? (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold leading-6 text-rose-900">
                  {importError}
                </div>
              ) : null}

              {importRows.length > 0 && !importResult ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-black text-[#071D49]">Preview Stock List</h3>
                      <p className="mt-1 text-sm text-[#64748B]">Nothing is added until you select Import Valid Rows.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-black">
                      <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-800">{importRows.filter((row) => row.errors.length === 0).length} ready</span>
                      <span className="rounded-full bg-rose-100 px-3 py-1.5 text-rose-800">{importRows.filter((row) => row.errors.length > 0).length} need correction</span>
                      <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-800">{importRows.filter((row) => row.warnings.length > 0).length} possible duplicates</span>
                    </div>
                  </div>

                  <div className="grid gap-3 md:hidden">
                    {importRows.map((row) => (
                      <article key={row.row} className={cn("rounded-xl border p-4", row.errors.length ? "border-rose-200 bg-rose-50" : row.warnings.length ? "border-amber-200 bg-amber-50" : "border-[#D8E0EC] bg-white")}>
                        <div className="flex items-start justify-between gap-3">
                          <div><p className="text-xs font-black text-[#64748B]">CSV row {row.row}</p><p className="mt-1 font-black text-[#071D49]">{row.item.item_name || "Item name missing"}</p></div>
                          <StatusChip label={row.errors.length ? "Needs Correction" : row.warnings.length ? "Check Duplicate" : "Ready"} tone={row.errors.length ? "danger" : row.warnings.length ? "warning" : "success"} />
                        </div>
                        <p className="mt-3 text-sm text-[#334155]">{itemTypeLabel(row.item.item_type)} · {row.item.quantity} {row.item.unit === "Custom" ? row.item.custom_unit : row.item.unit} · {row.item.storage_location || "Location missing"}</p>
                        {row.errors.map((error) => <p key={error} className="mt-2 text-sm font-bold text-rose-800">{error}</p>)}
                        {row.warnings.map((warning) => <p key={warning} className="mt-2 text-sm font-bold text-amber-800">{warning}</p>)}
                      </article>
                    ))}
                  </div>

                  <div className="hidden overflow-hidden rounded-xl border border-[#D8E0EC] md:block">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#F8FAFC] text-[#071D49]"><tr><th className="px-3 py-3 font-bold">Row</th><th className="px-3 py-3 font-bold">Item</th><th className="px-3 py-3 font-bold">Type</th><th className="px-3 py-3 font-bold">Quantity</th><th className="px-3 py-3 font-bold">Storage Location</th><th className="px-3 py-3 font-bold">Check</th></tr></thead>
                      <tbody>
                        {importRows.map((row) => (
                          <tr key={row.row} className={cn("border-t border-[#D8E0EC] align-top", row.errors.length ? "bg-rose-50" : row.warnings.length ? "bg-amber-50" : "bg-white")}>
                            <td className="px-3 py-3 font-black text-[#64748B]">{row.row}</td>
                            <td className="px-3 py-3 font-black text-[#071D49]">{row.item.item_name || "Item name missing"}</td>
                            <td className="px-3 py-3 text-[#64748B]">{itemTypeLabel(row.item.item_type)}</td>
                            <td className="px-3 py-3 text-[#64748B]">{row.item.quantity} {row.item.unit === "Custom" ? row.item.custom_unit : row.item.unit}</td>
                            <td className="px-3 py-3 text-[#64748B]">{row.item.storage_location || "Location missing"}</td>
                            <td className="max-w-xs px-3 py-3">
                              {row.errors.length === 0 && row.warnings.length === 0 ? <StatusChip label="Ready" tone="success" /> : null}
                              {row.errors.map((error) => <p key={error} className="mb-1 text-xs font-bold text-rose-800">{error}</p>)}
                              {row.warnings.map((warning) => <p key={warning} className="mb-1 text-xs font-bold text-amber-800">{warning}</p>)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importRows.some((row) => row.errors.length) ? (
                    <button type="button" onClick={downloadImportErrors} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-300 px-4 text-sm font-black text-rose-800">
                      <Download className="h-4 w-4" aria-hidden="true" /> Download Error Report
                    </button>
                  ) : null}
                </div>
              ) : null}

              {importResult ? (
                <div className="space-y-4">
                  <div role="status" className={cn("rounded-xl border p-4 font-bold", importResult.failed_count || importResult.duplicate_count ? "border-amber-300 bg-amber-50 text-amber-950" : "border-emerald-200 bg-emerald-50 text-emerald-900")}>
                    {importResult.message}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center"><p className="text-2xl font-black text-emerald-800">{importResult.imported_count}</p><p className="text-xs font-bold text-emerald-800">Imported</p></div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center"><p className="text-2xl font-black text-amber-800">{importResult.duplicate_count}</p><p className="text-xs font-bold text-amber-800">Duplicates</p></div>
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center"><p className="text-2xl font-black text-rose-800">{importResult.failed_count}</p><p className="text-xs font-bold text-rose-800">Failed</p></div>
                  </div>
                  <div className="space-y-2">
                    {importResult.results.map((result) => (
                      <div key={`${result.row}:${result.status}`} className="flex flex-col gap-2 rounded-xl border border-[#D8E0EC] p-3 sm:flex-row sm:items-start sm:justify-between">
                        <div><p className="text-xs font-black text-[#64748B]">CSV row {result.row}</p><p className="mt-1 text-sm font-semibold leading-6 text-[#334155]">{result.message}</p></div>
                        <StatusChip label={result.status === "imported" ? "Imported" : result.status === "duplicate" ? "Duplicate — Review" : "Failed"} tone={result.status === "imported" ? "success" : result.status === "duplicate" ? "warning" : "danger"} />
                      </div>
                    ))}
                  </div>
                  {importResult.failed_count > 0 ? (
                    <button type="button" onClick={downloadImportErrors} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-300 px-4 text-sm font-black text-rose-800">
                      <Download className="h-4 w-4" aria-hidden="true" /> Download Error Report
                    </button>
                  ) : null}
                </div>
              ) : null}

              {!importFileName && !importError ? (
                <WorkspaceEmpty title="No stock list has been selected." description="Choose a CSV file above. MyShule will show a preview before anything is added to the school stock book." />
              ) : null}
            </div>

            <footer className="sticky bottom-0 z-20 mt-auto flex flex-col gap-3 border-t border-[#D8E0EC] bg-white/95 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:rounded-b-2xl sm:px-6">
              <SaveState state={importSaveState} />
              <div className="flex flex-wrap justify-end gap-2">
                {importFileName ? <button type="button" disabled={importMutation.isPending} onClick={clearImport} className="min-h-12 rounded-xl border border-[#C8D5EA] px-4 text-sm font-black text-[#071D49] disabled:opacity-50">Clear</button> : null}
                <button type="button" disabled={importMutation.isPending} onClick={() => setImportOpen(false)} className="min-h-12 rounded-xl border border-[#C8D5EA] px-4 text-sm font-black text-[#071D49] disabled:opacity-50">{importResult ? "Done" : "Close"}</button>
                {importRows.length > 0 && !importResult ? (
                  <button
                    type="button"
                    disabled={importMutation.isPending || !importRows.some((row) => row.errors.length === 0)}
                    onClick={() => void submitStockList()}
                    className="min-h-12 flex-1 rounded-xl bg-[#071D49] px-5 text-sm font-black text-white disabled:opacity-50 sm:flex-none"
                  >
                    {importMutation.isPending ? "Importing…" : `Import Valid Rows (${importRows.filter((row) => row.errors.length === 0).length})`}
                  </button>
                ) : null}
              </div>
            </footer>
          </section>
        </div>
      ) : null}

      <Panel
        title="Current Stock"
        description="Search using the ordinary item name. Quantities and warning levels come from the school stock book."
        icon={ShieldCheck}
        actions={(
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={openAddItem} className="min-h-11 rounded-xl bg-[#071D49] px-4 text-sm font-black text-white">Add Item</button>
            <button type="button" onClick={() => { setStockFormOpen(true); setSaveState(null); setConfirmation(null); }} className="min-h-11 rounded-xl border border-[#C8D5EA] px-4 text-sm font-black text-[#071D49]">Add Stock</button>
            <button type="button" onClick={() => setImportOpen(true)} className="min-h-11 rounded-xl border border-[#C8D5EA] px-4 text-sm font-black text-[#071D49]">Import Stock List</button>
          </div>
        )}
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <label className="relative block">
            <span className="sr-only">Find a laboratory item</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" aria-hidden="true" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setStockPage(1); }} placeholder="Find an item by name or location" className={`${inputClass} pl-9`} />
          </label>
          <label>
            <span className="sr-only">Filter stock status</span>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setStockPage(1); }} className={inputClass}>
              {statusOptions.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
        </div>

        <div id="lab-stock-list">
          {inventoryQuery.isLoading ? (
            <p className="py-10 text-center text-sm font-semibold text-[#64748B]">Loading the laboratory stock book…</p>
          ) : items.length === 0 ? (
            <WorkspaceEmpty
              title="No laboratory items have been added yet."
              description="Add the first item now or import an existing laboratory stock list from a CSV file."
              actions={(
                <>
                  <button type="button" onClick={openAddItem} className="min-h-11 rounded-xl bg-[#071D49] px-4 text-sm font-black text-white">Add First Item</button>
                  <button type="button" onClick={() => setImportOpen(true)} className="min-h-11 rounded-xl border border-[#C8D5EA] bg-white px-4 text-sm font-black text-[#071D49]">Import Stock List</button>
                </>
              )}
            />
          ) : filteredItems.length === 0 ? (
            <WorkspaceEmpty title="No items match this search." description="Try part of the ordinary item name, change the status filter, or clear the search." actions={<button type="button" onClick={() => { setSearch(""); setStatusFilter("All"); setStockPage(1); }} className="min-h-11 rounded-xl border border-[#C8D5EA] px-4 text-sm font-black text-[#071D49]">Clear Search</button>} />
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {pagedItems.map((item) => (
                  <article key={`${item.item_source}:${item.id}`} className="rounded-xl border border-[#D8E0EC] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-[#071D49]">{item.item_name}</p>
                        <p className="mt-1 text-sm text-[#64748B]">{item.category}</p>
                      </div>
                      <StatusChip label={item.status} tone={statusTone(item.status)} />
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div><dt className="font-semibold text-[#64748B]">Available</dt><dd className="mt-1 font-black text-[#071D49]">{item.quantity_available} {item.unit}</dd></div>
                      <div><dt className="font-semibold text-[#64748B]">Minimum</dt><dd className="mt-1 font-black text-[#071D49]">{item.minimum_stock_level} {item.unit}</dd></div>
                      <div className="col-span-2"><dt className="font-semibold text-[#64748B]">Storage Location</dt><dd className="mt-1 font-bold text-[#071D49]">{item.storage_location || "Not set"}</dd></div>
                      {item.item_type === "chemical" && item.expiry_date ? <div className="col-span-2"><dt className="font-semibold text-[#64748B]">Expiry Date</dt><dd className="mt-1 font-bold text-[#071D49]">{formatKenyanDate(item.expiry_date)}</dd></div> : null}
                    </dl>
                    <button type="button" onClick={() => { setStockItemId(item.id); setStockFormOpen(true); setSaveState(null); }} className="mt-4 min-h-11 w-full rounded-xl border border-[#C8D5EA] text-sm font-black text-[#071D49]">Add Stock</button>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-hidden rounded-xl border border-[#D8E0EC] md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F8FAFC] text-[#071D49]"><tr><th className="px-4 py-3 font-bold">Item</th><th className="px-4 py-3 font-bold">Available</th><th className="px-4 py-3 font-bold">Minimum</th><th className="px-4 py-3 font-bold">Storage Location</th><th className="px-4 py-3 font-bold">Status</th><th className="px-4 py-3 text-right font-bold">Action</th></tr></thead>
                  <tbody>
                    {pagedItems.map((item) => (
                      <tr key={`${item.item_source}:${item.id}`} className="border-t border-[#D8E0EC]">
                        <td className="px-4 py-3"><p className="font-black text-[#071D49]">{item.item_name}</p><p className="mt-1 text-xs font-semibold text-[#64748B]">{item.category} · {itemTypeLabel(item.item_type)}</p></td>
                        <td className="px-4 py-3 font-bold text-[#071D49]">{item.quantity_available} {item.unit}</td>
                        <td className="px-4 py-3 text-[#64748B]">{item.minimum_stock_level} {item.unit}</td>
                        <td className="px-4 py-3 text-[#64748B]">{item.storage_location || "Not set"}</td>
                        <td className="px-4 py-3"><StatusChip label={item.status} tone={statusTone(item.status)} /></td>
                        <td className="px-4 py-3 text-right"><button type="button" onClick={() => { setStockItemId(item.id); setStockFormOpen(true); setSaveState(null); }} className="min-h-10 rounded-lg border border-[#C8D5EA] px-3 font-black text-[#071D49]">Add Stock</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <nav aria-label="Stock book pages" className="mt-4 flex flex-col gap-3 rounded-xl bg-[#F8FAFC] p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-[#475569]">
                  Showing {stockPageStart + 1}–{Math.min(stockPageStart + pagedItems.length, filteredItems.length)} of {filteredItems.length} items
                </p>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <button type="button" disabled={currentStockPage === 1} onClick={() => setStockPage((page) => Math.max(1, page - 1))} className="min-h-11 rounded-xl border border-[#C8D5EA] bg-white px-4 text-sm font-black text-[#071D49] disabled:cursor-not-allowed disabled:opacity-45">Previous</button>
                  <span className="min-w-24 text-center text-sm font-bold text-[#475569]">Page {currentStockPage} of {stockPageCount}</span>
                  <button type="button" disabled={currentStockPage === stockPageCount} onClick={() => setStockPage((page) => Math.min(stockPageCount, page + 1))} className="min-h-11 rounded-xl border border-[#C8D5EA] bg-white px-4 text-sm font-black text-[#071D49] disabled:cursor-not-allowed disabled:opacity-45">Next</button>
                </div>
              </nav>
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
