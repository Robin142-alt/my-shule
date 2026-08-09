"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, MapPin, Save } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { useSchoolQuery } from "@/lib/data/school-hooks";

import { LabQuickActions, Panel, SaveState, StatusChip, WorkspaceEmpty, WorkspaceError } from "./shared";
import type { LabInventoryData, LaboratoryActionResponse, LabItemType, LabStocktake } from "./types";
import { formatKenyanDate, statusTone } from "./types";
import { createSubmissionId, isPendingSync, useLaboratoryMutation } from "./use-laboratory-mutation";

type StocktakeCount = { countedQuantity: string; condition: string };
type StocktakeLocalDraft = { counts?: Record<string, StocktakeCount>; notes?: string; position?: number };
type StocktakeResponse = LaboratoryActionResponse<{ stocktake: LabStocktake }>;

const fieldClass =
  "min-h-12 w-full rounded-xl border border-[#C8D5EA] bg-white px-3 text-base text-[#071D49] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function countDraftKey(stocktakeId: string) {
  return `myshule:lab-stocktake:${stocktakeId}`;
}

function countToNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function readLocalStocktakeDraft(stocktakeId: string): StocktakeLocalDraft | null {
  try {
    const saved = window.localStorage.getItem(countDraftKey(stocktakeId));
    return saved ? JSON.parse(saved) as StocktakeLocalDraft : null;
  } catch {
    return null;
  }
}

export function StocktakeWorkspace() {
  const inventoryQuery = useSchoolQuery<LabInventoryData>("/labs/inventory");
  const stocktakesQuery = useSchoolQuery<LabStocktake[]>("/labs/stocktakes");
  const [startOpen, setStartOpen] = useState(false);
  const [locationId, setLocationId] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState<LabItemType | "">("");
  const [submissionId, setSubmissionId] = useState(() => createSubmissionId("lab-stocktake"));
  const [selectedStocktakeId, setSelectedStocktakeId] = useState("");
  const [position, setPosition] = useState(0);
  const [mode, setMode] = useState<"count" | "review">("count");
  const [counts, setCounts] = useState<Record<string, StocktakeCount>>({});
  const [notes, setNotes] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "failed" | "pending_sync" | null>(null);
  const [notice, setNotice] = useState("");
  const [validationMessage, setValidationMessage] = useState("");

  const stocktakes = stocktakesQuery.data ?? [];
  const selectedStocktake = stocktakes.find((entry) => entry.id === selectedStocktakeId) ?? null;
  const locations = inventoryQuery.data?.locations ?? [];

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("action") === "start") {
      setStartOpen(true);
    }
  }, []);

  useEffect(() => {
    if (selectedStocktakeId || stocktakes.length === 0) return;
    const resumable = stocktakes.find((entry) => entry.status !== "submitted") ?? stocktakes[0];
    setSelectedStocktakeId(resumable.id);
  }, [selectedStocktakeId, stocktakes]);

  useEffect(() => {
    if (!selectedStocktake) return;
    const localDraft = readLocalStocktakeDraft(selectedStocktake.id);
    const serverCounts = Object.fromEntries(
      selectedStocktake.items.map((item) => [
        item.id,
        {
          countedQuantity: item.counted_quantity === null ? "" : String(item.counted_quantity),
          condition: item.condition ?? "Good",
        },
      ]),
    );
    setCounts({ ...serverCounts, ...(localDraft?.counts ?? {}) });
    setNotes(localDraft?.notes ?? selectedStocktake.notes ?? "");
    setPosition(Math.min(localDraft?.position ?? selectedStocktake.current_position ?? 0, Math.max(selectedStocktake.items.length - 1, 0)));
    setMode(selectedStocktake.status === "submitted" ? "review" : "count");
    setValidationMessage("");
  }, [selectedStocktake?.id]);

  useEffect(() => {
    if (!selectedStocktake || selectedStocktake.status === "submitted") return;
    try {
      window.localStorage.setItem(countDraftKey(selectedStocktake.id), JSON.stringify({ counts, notes, position }));
    } catch {
      // The in-memory form remains usable when local draft storage is unavailable.
    }
  }, [counts, notes, position, selectedStocktake]);

  const startMutation = useLaboratoryMutation<StocktakeResponse, { location_id?: string; location_name: string; category?: string; item_type?: LabItemType; submission_id: string }>({
    action: "start-stocktake",
    path: "/labs/stocktakes",
    onMutate: () => {
      setSaveState("saving");
      setNotice("");
    },
    onSuccess: (response) => {
      if (isPendingSync(response)) {
        setSaveState("pending_sync");
        setNotice("The stocktake start is waiting for a confirmed server response. The request will not be submitted twice.");
        return;
      }
      setSaveState("saved");
      setNotice(response.message);
      setSelectedStocktakeId(response.stocktake.id);
      setStartOpen(false);
      setCategoryFilter("");
      setItemTypeFilter("");
      setSubmissionId(createSubmissionId("lab-stocktake"));
    },
    onError: () => setSaveState("failed"),
  });

  const saveMutation = useLaboratoryMutation<StocktakeResponse, { stocktakeId: string; items: Array<{ line_id: string; counted_quantity: number; condition?: string }>; notes?: string }>({
    action: "save-stocktake-progress",
    method: "PATCH",
    path: (variables) => `/labs/stocktakes/${variables.stocktakeId}`,
    body: ({ items, notes: nextNotes }) => ({ items, notes: nextNotes }),
    onMutate: () => {
      setSaveState("saving");
      setNotice("");
    },
    onSuccess: (response) => {
      if (isPendingSync(response)) {
        setSaveState("pending_sync");
        setNotice("Your counts are saved on this device and are pending sync. Stock has not been adjusted yet.");
        return;
      }
      setSaveState("saved");
      setNotice(response.message);
    },
    onError: () => setSaveState("failed"),
  });

  const submitMutation = useLaboratoryMutation<StocktakeResponse, { stocktakeId: string; items: Array<{ line_id: string; counted_quantity: number; condition?: string }>; notes?: string }>({
    action: "submit-stocktake",
    path: (variables) => `/labs/stocktakes/${variables.stocktakeId}/submit`,
    body: ({ items, notes: nextNotes }) => ({ items, notes: nextNotes }),
    onMutate: () => {
      setSaveState("saving");
      setNotice("");
    },
    onSuccess: (response) => {
      if (isPendingSync(response)) {
        setSaveState("pending_sync");
        setNotice("Submission is pending sync. Expected quantities remain unchanged until the server confirms it.");
        return;
      }
      setSaveState("saved");
      setNotice(response.message);
      setMode("review");
      try {
        window.localStorage.removeItem(countDraftKey(response.stocktake.id));
      } catch {
        // Nothing else is required when local storage is unavailable.
      }
    },
    onError: () => setSaveState("failed"),
  });

  const countedLines = useMemo(() => {
    if (!selectedStocktake) return [];
    return selectedStocktake.items.flatMap((item) => {
      const draft = counts[item.id];
      const counted = countToNumber(draft?.countedQuantity ?? "");
      return counted === null
        ? []
        : [{ line_id: item.id, counted_quantity: counted, condition: draft?.condition || undefined }];
    });
  }, [counts, selectedStocktake]);

  const allCounted = Boolean(selectedStocktake?.items.length) && countedLines.length === selectedStocktake?.items.length;

  function startSelectedLocation() {
    const location = locations.find((entry) => entry.id === locationId);
    if (!location) {
      setValidationMessage("Select the laboratory, store, cupboard or shelf you are about to count.");
      return;
    }
    setValidationMessage("");
    startMutation.mutate({
      location_id: location.id,
      location_name: location.full_path,
      category: categoryFilter || undefined,
      item_type: itemTypeFilter || undefined,
      submission_id: submissionId,
    });
  }

  function saveProgress() {
    if (!selectedStocktake) return;
    saveMutation.mutate({ stocktakeId: selectedStocktake.id, items: countedLines, notes: notes || undefined });
  }

  function moveTo(nextPosition: number) {
    if (!selectedStocktake) return;
    const current = selectedStocktake.items[position];
    if (nextPosition > position && current && countToNumber(counts[current.id]?.countedQuantity ?? "") === null) {
      setValidationMessage(`Enter the counted quantity for ${current.item_name} before moving on.`);
      return;
    }
    setValidationMessage("");
    setPosition(Math.max(0, Math.min(nextPosition, selectedStocktake.items.length - 1)));
  }

  function openReview() {
    if (!allCounted) {
      setValidationMessage("Count every listed item before reviewing the differences.");
      const firstMissing = selectedStocktake?.items.findIndex((item) => countToNumber(counts[item.id]?.countedQuantity ?? "") === null) ?? -1;
      if (firstMissing >= 0) setPosition(firstMissing);
      return;
    }
    setValidationMessage("");
    setMode("review");
  }

  function submitStocktake() {
    if (!selectedStocktake || !allCounted) return;
    submitMutation.mutate({ stocktakeId: selectedStocktake.id, items: countedLines, notes: notes || undefined });
  }

  const selectedLocation = locations.find((entry) => entry.id === locationId);
  const itemsAtSelectedLocation = (inventoryQuery.data?.items ?? []).filter((item) => (
    !selectedLocation || item.storage_location?.toLowerCase() === selectedLocation.full_path.toLowerCase()
  ));
  const availableCategories = Array.from(new Set(itemsAtSelectedLocation.map((item) => item.category).filter(Boolean))).sort();
  const currentItem = selectedStocktake?.items[position] ?? null;
  const isSubmitted = selectedStocktake?.status === "submitted";

  return (
    <div className="space-y-5">
      <LabQuickActions compact />
      {notice ? <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-950">{notice}</div> : null}
      <SaveState state={saveState} />

      <Panel
        title="Stocktake by Location"
        description="Count one cupboard, cabinet or shelf at a time. Save your work and continue later."
        icon={ClipboardCheck}
        actions={
          <button type="button" onClick={() => setStartOpen(true)} className="min-h-11 rounded-xl bg-[#0F3F8A] px-4 text-sm font-black text-white hover:bg-[#0B326F]">
            Start Stocktake
          </button>
        }
      >
        {stocktakesQuery.error || inventoryQuery.error ? (
          <WorkspaceError
            message={(stocktakesQuery.error ?? inventoryQuery.error)?.message ?? "Please try again."}
            onRetry={() => {
              void stocktakesQuery.refetch();
              void inventoryQuery.refetch();
            }}
          />
        ) : stocktakesQuery.isLoading || inventoryQuery.isLoading ? (
          <p className="py-10 text-center text-sm text-[#64748B]">Loading stocktake locations and saved progress…</p>
        ) : stocktakes.length === 0 ? (
          <WorkspaceEmpty
            title="No stocktake has been started"
            description="Select a laboratory, store, cupboard or shelf to begin counting the items kept there."
            actions={<button type="button" onClick={() => setStartOpen(true)} className="min-h-11 rounded-xl bg-[#0F3F8A] px-4 font-black text-white">Select a Location</button>}
          />
        ) : (
          <div className="space-y-5">
            <label className="block text-sm font-bold text-[#071D49]">
              Saved stocktakes
              <select
                value={selectedStocktakeId}
                onChange={(event) => setSelectedStocktakeId(event.target.value)}
                className={`${fieldClass} mt-2`}
              >
                {stocktakes.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.location_name} — {entry.status === "submitted" ? "Submitted" : "Continue Counting"}
                  </option>
                ))}
              </select>
            </label>

            {selectedStocktake ? (
              <>
                <div className="flex flex-col gap-3 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-black text-[#071D49]"><MapPin className="h-4 w-4" aria-hidden="true" />{selectedStocktake.location_name}</p>
                    <p className="mt-1 text-sm text-[#64748B]">Started {formatKenyanDate(selectedStocktake.started_at)} · {selectedStocktake.items.length} items</p>
                  </div>
                  <StatusChip label={isSubmitted ? "Submitted" : `${countedLines.length} of ${selectedStocktake.items.length} counted`} tone={isSubmitted ? "success" : "info"} />
                </div>

                {selectedStocktake.items.length === 0 ? (
                  <WorkspaceEmpty
                    title="No items are assigned to this location"
                    description="Check the storage location on each item, or start a stocktake for a different cupboard or shelf."
                    actions={<button type="button" onClick={() => setStartOpen(true)} className="min-h-11 rounded-xl border border-blue-300 bg-blue-50 px-4 font-black text-blue-900">Choose Another Location</button>}
                  />
                ) : mode === "count" && !isSubmitted && currentItem ? (
                  <div className="space-y-4">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`${countedLines.length} of ${selectedStocktake.items.length} items counted`}>
                      <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${Math.round((countedLines.length / selectedStocktake.items.length) * 100)}%` }} />
                    </div>
                    <article className="rounded-2xl border-2 border-blue-100 bg-white p-5 shadow-sm">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Item {position + 1} of {selectedStocktake.items.length}</p>
                      <h3 className="mt-2 text-2xl font-black text-[#071D49]">{currentItem.item_name}</h3>
                      <p className="mt-1 text-sm text-[#64748B]">Expected: <strong className="text-[#071D49]">{currentItem.expected_quantity} {currentItem.unit}</strong></p>
                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <label className="text-sm font-bold text-[#071D49]">
                          Counted Quantity
                          <input
                            autoFocus
                            type="number"
                            min="0"
                            step="any"
                            inputMode="decimal"
                            value={counts[currentItem.id]?.countedQuantity ?? ""}
                            onChange={(event) => setCounts((current) => ({
                              ...current,
                              [currentItem.id]: { countedQuantity: event.target.value, condition: current[currentItem.id]?.condition || "Good" },
                            }))}
                            className={`${fieldClass} mt-2`}
                          />
                        </label>
                        <label className="text-sm font-bold text-[#071D49]">
                          Condition
                          <select
                            value={counts[currentItem.id]?.condition ?? "Good"}
                            onChange={(event) => setCounts((current) => ({
                              ...current,
                              [currentItem.id]: { countedQuantity: current[currentItem.id]?.countedQuantity ?? "", condition: event.target.value },
                            }))}
                            className={`${fieldClass} mt-2`}
                          >
                            <option>Good</option>
                            <option>Damaged</option>
                            <option>Missing</option>
                            <option>Under Maintenance</option>
                          </select>
                        </label>
                      </div>
                    </article>

                    {validationMessage ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-800">{validationMessage}</p> : null}

                    <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-between">
                      <button type="button" disabled={position === 0} onClick={() => moveTo(position - 1)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#C8D5EA] bg-white px-5 font-black text-[#071D49] disabled:opacity-40">
                        <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Previous
                      </button>
                      {position < selectedStocktake.items.length - 1 ? (
                        <button type="button" onClick={() => moveTo(position + 1)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0F3F8A] px-5 font-black text-white">
                          Next <ArrowRight className="h-5 w-5" aria-hidden="true" />
                        </button>
                      ) : (
                        <button type="button" onClick={openReview} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 font-black text-white">
                          Review Differences <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    <button type="button" disabled={saveMutation.isPending} onClick={saveProgress} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-4 font-black text-blue-900 disabled:opacity-60 sm:w-auto">
                      <Save className="h-5 w-5" aria-hidden="true" /> {saveMutation.isPending ? "Saving…" : "Save and Continue Later"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-black text-[#071D49]">Review expected and counted quantities</h3>
                        <p className="text-sm text-[#64748B]">No stock balance changes until you submit this location.</p>
                      </div>
                      {!isSubmitted ? <button type="button" onClick={() => setMode("count")} className="min-h-10 rounded-lg border border-[#C8D5EA] px-4 text-sm font-black text-[#071D49]">Back to Counting</button> : null}
                    </div>
                    <div className="space-y-3">
                      {selectedStocktake.items.map((item) => {
                        const counted = countToNumber(counts[item.id]?.countedQuantity ?? String(item.counted_quantity ?? ""));
                        const difference = counted === null ? null : counted - Number(item.expected_quantity);
                        return (
                          <article key={item.id} className="grid gap-3 rounded-xl border border-[#D8E0EC] p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                            <div><p className="font-black text-[#071D49]">{item.item_name}</p><p className="text-sm text-[#64748B]">{counts[item.id]?.condition || item.condition || "Condition not recorded"}</p></div>
                            <p className="text-sm text-[#64748B]">Expected <strong className="text-[#071D49]">{item.expected_quantity} {item.unit}</strong></p>
                            <p className="text-sm text-[#64748B]">Counted <strong className="text-[#071D49]">{counted ?? "Not counted"} {item.unit}</strong></p>
                            <StatusChip label={difference === null ? "Not Counted" : difference === 0 ? "Matches" : `${difference > 0 ? "+" : ""}${difference} difference`} tone={difference === 0 ? "success" : "warning"} />
                          </article>
                        );
                      })}
                    </div>
                    <label className="block text-sm font-bold text-[#071D49]">
                      Stocktake Note (optional)
                      <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className={`${fieldClass} mt-2 py-3`} placeholder="Explain any differences that need review." />
                    </label>
                    {!isSubmitted ? (
                      <button type="button" disabled={submitMutation.isPending || !allCounted} onClick={submitStocktake} className="min-h-12 w-full rounded-xl bg-emerald-700 px-5 font-black text-white disabled:opacity-50 sm:w-auto">
                        {submitMutation.isPending ? "Submitting…" : "Submit Stocktake"}
                      </button>
                    ) : (
                      <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">Submitted {formatKenyanDate(selectedStocktake.submitted_at)}. Stock differences have movement and audit records.</p>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </Panel>

      <Modal
        open={startOpen}
        title="Start Stocktake"
        description="Choose the exact place you are about to count."
        onClose={() => setStartOpen(false)}
        mobileFullScreen
        footer={
          <>
            <button type="button" onClick={() => setStartOpen(false)} className="min-h-11 rounded-xl border border-[#C8D5EA] px-4 font-black text-[#071D49]">Cancel</button>
            <button type="button" disabled={startMutation.isPending || locations.length === 0} onClick={startSelectedLocation} className="min-h-11 rounded-xl bg-[#0F3F8A] px-4 font-black text-white disabled:opacity-50">
              {startMutation.isPending ? "Starting…" : "Start Counting"}
            </button>
          </>
        }
      >
        {locations.length === 0 ? (
          <WorkspaceEmpty title="No storage locations are set up" description="Add a laboratory, cupboard or shelf while adding an inventory item, then return here to start counting." />
        ) : (
          <div className="space-y-4">
            <label className="block text-sm font-bold text-[#071D49]">
              Laboratory, Cupboard or Shelf
              <select value={locationId} onChange={(event) => { setLocationId(event.target.value); setCategoryFilter(""); setItemTypeFilter(""); setValidationMessage(""); }} className={`${fieldClass} mt-2`}>
                <option value="">Select a location</option>
                {locations.filter((entry) => entry.is_active).map((entry) => <option key={entry.id} value={entry.id}>{entry.full_path}</option>)}
              </select>
            </label>
            {selectedLocation ? (
              <fieldset className="grid gap-4 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 sm:grid-cols-2">
                <legend className="px-1 text-sm font-black text-[#071D49]">Narrow this location (optional)</legend>
                <label className="text-sm font-bold text-[#071D49]">
                  Category
                  <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={`${fieldClass} mt-2`}>
                    <option value="">All categories</option>
                    {availableCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </label>
                <label className="text-sm font-bold text-[#071D49]">
                  Item Type
                  <select value={itemTypeFilter} onChange={(event) => setItemTypeFilter(event.target.value as LabItemType | "")} className={`${fieldClass} mt-2`}>
                    <option value="">All item types</option>
                    <option value="chemical">Chemical or Reagent</option>
                    <option value="apparatus">Apparatus or Equipment</option>
                    <option value="consumable">Consumable</option>
                    <option value="safety_equipment">Safety Equipment</option>
                  </select>
                </label>
                <p className="text-sm leading-6 text-[#64748B] sm:col-span-2">Leave both blank to count every item at this location.</p>
              </fieldset>
            ) : null}
          </div>
        )}
        {selectedLocation ? <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-950">You will count {categoryFilter || itemTypeFilter ? "the selected group of items" : "all items"} stored at <strong>{selectedLocation.full_path}</strong>.</p> : null}
        {validationMessage ? <p role="alert" className="mt-3 text-sm font-bold text-rose-700">{validationMessage}</p> : null}
      </Modal>
    </div>
  );
}
