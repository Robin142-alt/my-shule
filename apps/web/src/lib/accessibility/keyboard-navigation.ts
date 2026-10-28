import type { KeyboardEvent } from "react";

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
const fieldSelector = "input, select, textarea";
const textTypes = new Set(["text", "email", "tel", "url", "password", "search"]);
const editingCells = new WeakMap<HTMLInputElement, () => void>();

function stopEditing(field: HTMLInputElement) {
  const onBlur = editingCells.get(field);
  if (onBlur) field.removeEventListener("blur", onBlur);
  editingCells.delete(field);
}

function startEditing(field: HTMLInputElement) {
  if (editingCells.has(field)) return;
  const onBlur = () => stopEditing(field);
  editingCells.set(field, onBlur);
  field.addEventListener("blur", onBlur, { once: true });
}

function available(field: Element): field is Field {
  if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return false;
  if (field.matches(':disabled, [readonly], [aria-disabled="true"], [type="hidden"]') || field.tabIndex < 0
    || field.closest('[hidden], [inert], [aria-hidden="true"], [data-keyboard-navigation="off"]')) return false;
  for (let ancestor: HTMLElement | null = field; ancestor; ancestor = ancestor.parentElement) {
    if (ancestor instanceof HTMLDetailsElement && !ancestor.open && !ancestor.querySelector("summary")?.contains(field)) return false;
    const style = window.getComputedStyle(ancestor);
    if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") return false;
  }
  return !field.matches('[type="button"], [type="submit"], [type="reset"], [type="image"]');
}

function nativeWidget(field: HTMLInputElement, allowNumber = false) {
  return !(textTypes.has(field.type) || (allowNumber && field.type === "number")) || Boolean(field.list)
    || Boolean(field.closest('[role="combobox"], [role="listbox"], [role="spinbutton"], [contenteditable="true"]'))
    || field.getAttribute("aria-autocomplete") !== null || field.getAttribute("aria-expanded") === "true";
}

function usableEvent(event: KeyboardEvent<HTMLElement>, allowNumber = false): event is KeyboardEvent<HTMLElement> & { target: HTMLInputElement } {
  return !event.defaultPrevented && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229
    && !event.altKey && !event.ctrlKey && !event.metaKey
    && event.target instanceof HTMLInputElement && available(event.target) && !nativeWidget(event.target, allowNumber);
}

function focusField(field: Field) {
  field.focus({ preventScroll: true });
  const rect = field.getBoundingClientRect();
  let outside = rect.top < 0 || rect.left < 0 || rect.bottom > window.innerHeight || rect.right > window.innerWidth;
  for (let ancestor = field.parentElement; ancestor && !outside; ancestor = ancestor.parentElement) {
    const style = window.getComputedStyle(ancestor);
    if (/(auto|scroll)/.test(`${style.overflowY} ${style.overflowX}`)) {
      const bounds = ancestor.getBoundingClientRect();
      outside = rect.top < bounds.top || rect.bottom > bounds.bottom || rect.left < bounds.left || rect.right > bounds.right;
    }
  }
  if (outside) field.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "auto" });
}

/** Opt in on the form/data-entry wrapper, never on document or the app shell.
 * Scanner inputs and custom widgets can opt out with data-keyboard-navigation="off".
 * Bubble-phase handlers preserve child controls' handled keys and ordinary Tab behavior.
 */
export function onFormNavigationKeyDown(event: KeyboardEvent<HTMLElement>) {
  if (!usableEvent(event, event.key === "Enter") || !["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) return;
  if (event.shiftKey && event.key !== "Enter") return;
  const field = event.target;
  const form = field.closest("form");
  const scope = form && event.currentTarget.contains(form) ? form : event.currentTarget;
  const fields = Array.from(scope.querySelectorAll(fieldSelector)).filter(available);
  const index = fields.indexOf(field);
  if (index < 0) return;
  const previous = event.key === "ArrowUp" || (event.key === "Enter" && event.shiftKey);
  const next = fields[index + (previous ? -1 : 1)];
  // Enter never turns an ordinary text/number field into an implicit irreversible submit.
  if (next || event.key === "Enter") event.preventDefault();
  if (next) focusField(next);
}

/** Mark editable inputs with data-grid-row/column. Coordinates follow the rendered,
 * eligible rows, so filtering and class-specific subjects cannot navigate stale cells.
 * F2/typing enters edit mode; Escape returns to navigation; Enter moves vertically.
 * Horizontal arrows always preserve an active text selection/caret within the value.
 */
export function onGridNavigationKeyDown(event: KeyboardEvent<HTMLElement>) {
  if (!usableEvent(event)) return;
  const field = event.target;
  if (!field.hasAttribute("data-grid-row") || !field.hasAttribute("data-grid-column")) return;
  if (event.key === "F2") { startEditing(field); event.preventDefault(); return; }
  if (event.key === "Escape") {
    if (editingCells.has(field)) { stopEditing(field); event.preventDefault(); }
    return;
  }
  if (event.key.length === 1 || event.key === "Backspace" || event.key === "Delete") { startEditing(field); return; }
  if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Enter"].includes(event.key)) return;
  if (event.shiftKey && event.key !== "Enter") return;
  if (editingCells.has(field) && event.key !== "Enter") return;
  if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && field.value
    && (field.selectionStart !== field.selectionEnd
      || (event.key === "ArrowLeft" ? field.selectionStart !== 0 : field.selectionEnd !== field.value.length))) return;
  const row = Number(field.dataset.gridRow); const column = Number(field.dataset.gridColumn);
  if (!Number.isFinite(row) || !Number.isFinite(column)) return;
  const vertical = ["ArrowUp", "ArrowDown", "Enter"].includes(event.key);
  const backwards = event.key === "ArrowUp" || event.key === "ArrowLeft" || (event.key === "Enter" && event.shiftKey);
  const coordinate = vertical ? "gridRow" : "gridColumn";
  const current = vertical ? row : column;
  const candidates = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement>("input[data-grid-row][data-grid-column]"))
    .filter(available).filter(cell => (vertical ? Number(cell.dataset.gridColumn) === column : Number(cell.dataset.gridRow) === row)
      && (backwards ? Number(cell.dataset[coordinate]) < current : Number(cell.dataset[coordinate]) > current))
    .sort((a, b) => (Number(a.dataset[coordinate]) - Number(b.dataset[coordinate])) * (backwards ? -1 : 1));
  event.preventDefault(); stopEditing(field);
  if (candidates[0]) { stopEditing(candidates[0]); focusField(candidates[0]); }
}
