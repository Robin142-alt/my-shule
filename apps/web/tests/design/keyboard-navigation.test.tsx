import { fireEvent, render, screen } from "@testing-library/react";
import { onFormNavigationKeyDown, onGridNavigationKeyDown } from "@/lib/accessibility/keyboard-navigation";

describe("opt-in data entry keyboard navigation", () => {
  it("moves in live form order, skips unavailable controls and never submits on the last text field", () => {
    const submit = jest.fn(event => event.preventDefault());
    const { rerender } = render(<form onKeyDown={onFormNavigationKeyDown} onSubmit={submit}>
      <input aria-label="Name" /><input aria-label="Disabled" disabled /><input aria-label="Readonly" readOnly />
      <div hidden><input aria-label="Hidden" /></div><fieldset disabled><input aria-label="Disabled fieldset" /></fieldset>
      <input aria-label="Phone" /><button>Save</button>
    </form>);
    const name = screen.getByLabelText("Name"); name.focus();
    expect(fireEvent.keyDown(name, { key: "ArrowDown" })).toBe(false);
    expect(screen.getByLabelText("Phone")).toHaveFocus();
    fireEvent.keyDown(screen.getByLabelText("Phone"), { key: "ArrowUp" });
    expect(name).toHaveFocus();
    fireEvent.keyDown(name, { key: "Enter" });
    expect(fireEvent.keyDown(screen.getByLabelText("Phone"), { key: "Enter" })).toBe(false);
    expect(submit).not.toHaveBeenCalled();
    rerender(<form onKeyDown={onFormNavigationKeyDown}><input aria-label="Name" /><input aria-label="Added" /><input aria-label="Phone" /></form>);
    fireEvent.keyDown(screen.getByLabelText("Name"), { key: "ArrowDown" });
    expect(screen.getByLabelText("Added")).toHaveFocus();
  });

  it("preserves native editing, widgets, modifiers, composition and Tab", () => {
    render(<form onKeyDown={onFormNavigationKeyDown}>
      <input aria-label="Text" defaultValue="unchanged" /><textarea aria-label="Notes" />
      <select aria-label="Class"><option>Form 1</option></select><input aria-label="Number" type="number" />
      <input aria-label="Date" type="date" /><input aria-label="Suggestions" list="names" /><datalist id="names" />
      <input aria-label="Combobox" role="combobox" aria-expanded="false" aria-controls="choices" /><div id="choices" role="listbox" /><input aria-label="Last" />
    </form>);
    for (const label of ["Notes", "Class", "Number", "Date", "Suggestions", "Combobox"]) {
      const input = screen.getByLabelText(label); input.focus();
      expect(fireEvent.keyDown(input, { key: "ArrowDown" })).toBe(true);
      expect(input).toHaveFocus();
    }
    const input = screen.getByLabelText("Text"); input.focus();
    for (const key of ["ArrowLeft", "ArrowRight", "Tab"]) expect(fireEvent.keyDown(input, { key })).toBe(true);
    expect(fireEvent.keyDown(input, { key: "ArrowDown", ctrlKey: true })).toBe(true);
    expect(fireEvent.keyDown(input, { key: "Enter", isComposing: true })).toBe(true);
    expect(input).toHaveValue("unchanged");
  });

  it("lets scanner Enter and existing handled keys run without changing focus", () => {
    const scan = jest.fn();
    render(<form onKeyDown={onFormNavigationKeyDown}>
      <input aria-label="Barcode" data-keyboard-navigation="off" onKeyDown={event => { if (event.key === "Enter") scan(); }} />
      <input aria-label="Custom" onKeyDown={event => event.preventDefault()} /><input aria-label="Next" />
    </form>);
    const barcode = screen.getByLabelText("Barcode"); barcode.focus();
    for (let index = 0; index < 7; index++) fireEvent.keyDown(barcode, { key: "Enter" });
    expect(scan).toHaveBeenCalledTimes(7); expect(barcode).toHaveFocus();
    const custom = screen.getByLabelText("Custom"); custom.focus();
    fireEvent.keyDown(custom, { key: "ArrowDown" }); expect(custom).toHaveFocus();
  });

  it("keeps number arrows native but uses Enter to move safely without implicitly saving", () => {
    render(<form onKeyDown={onFormNavigationKeyDown}>
      <input aria-label="Amount" type="number" /><input aria-label="Reference" /><button>Record payment</button>
    </form>);
    const amount = screen.getByLabelText("Amount"); amount.focus();
    expect(fireEvent.keyDown(amount, { key: "ArrowUp" })).toBe(true);
    expect(fireEvent.keyDown(amount, { key: "Enter" })).toBe(false);
    expect(screen.getByLabelText("Reference")).toHaveFocus();
    expect(fireEvent.keyDown(screen.getByLabelText("Reference"), { key: "Enter" })).toBe(false);
  });

  it("ends grid edit mode when focus leaves and preserves Escape when already navigating", () => {
    render(<div onKeyDown={onGridNavigationKeyDown}>
      <input aria-label="First cell" data-grid-row="0" data-grid-column="0" />
      <input aria-label="Second cell" data-grid-row="1" data-grid-column="0" />
    </div>);
    const first = screen.getByLabelText("First cell"); const second = screen.getByLabelText("Second cell");
    first.focus();
    expect(fireEvent.keyDown(first, { key: "Escape" })).toBe(true);
    fireEvent.keyDown(first, { key: "F2" });
    second.focus(); first.focus();
    fireEvent.keyDown(first, { key: "ArrowDown" }); expect(second).toHaveFocus();
  });

  it("navigates marksheet coordinates and skips locked cells without crossing another grid", () => {
    render(<><div onKeyDown={onGridNavigationKeyDown}>
      {[0, 1, 2].map(row => <div key={row}>{[0, 1].map(col => <input key={col} aria-label={`${row}-${col}`} data-grid-row={row} data-grid-column={col} disabled={row === 1 && col === 0} />)}</div>)}
    </div><input aria-label="Other grid" data-grid-row="3" data-grid-column="0" /></>);
    const first = screen.getByLabelText("0-0"); first.focus();
    fireEvent.keyDown(first, { key: "ArrowDown" }); expect(screen.getByLabelText("2-0")).toHaveFocus();
    fireEvent.keyDown(screen.getByLabelText("2-0"), { key: "Shift" });
    fireEvent.keyDown(screen.getByLabelText("2-0"), { key: "Enter", shiftKey: true }); expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: "ArrowRight" }); expect(screen.getByLabelText("0-1")).toHaveFocus();
    fireEvent.keyDown(screen.getByLabelText("0-1"), { key: "ArrowLeft" }); expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: "Enter" }); expect(screen.getByLabelText("2-0")).toHaveFocus();
    fireEvent.keyDown(screen.getByLabelText("2-0"), { key: "ArrowDown" }); expect(screen.getByLabelText("2-0")).toHaveFocus();
  });

  it("preserves a cell's text caret while editing and restores navigation after Escape or Enter", () => {
    render(<div onKeyDown={onGridNavigationKeyDown}>
      <input aria-label="Cell" defaultValue="42" data-grid-row="0" data-grid-column="0" />
      <input aria-label="Next row" data-grid-row="1" data-grid-column="0" />
    </div>);
    const cell = screen.getByLabelText("Cell") as HTMLInputElement; cell.focus(); cell.setSelectionRange(1, 1);
    expect(fireEvent.keyDown(cell, { key: "ArrowLeft" })).toBe(true);
    fireEvent.keyDown(cell, { key: "F2" });
    expect(fireEvent.keyDown(cell, { key: "ArrowDown" })).toBe(true); expect(cell).toHaveFocus();
    fireEvent.keyDown(cell, { key: "Escape" });
    fireEvent.keyDown(cell, { key: "ArrowDown" }); expect(screen.getByLabelText("Next row")).toHaveFocus();
    cell.focus(); fireEvent.keyDown(cell, { key: "5" });
    expect(fireEvent.keyDown(cell, { key: "ArrowDown" })).toBe(true);
    fireEvent.keyDown(cell, { key: "Enter" }); expect(screen.getByLabelText("Next row")).toHaveFocus();
    expect(cell).toHaveValue("42");
  });
});
