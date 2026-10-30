import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
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

  it("does not require or capture F2 or Escape before moving between score cells", () => {
    render(<div onKeyDown={onGridNavigationKeyDown}>
      <input aria-label="First cell" data-grid-row="0" data-grid-column="0" />
      <input aria-label="Second cell" data-grid-row="1" data-grid-column="0" />
    </div>);
    const first = screen.getByLabelText("First cell"); const second = screen.getByLabelText("Second cell");
    first.focus();
    expect(fireEvent.keyDown(first, { key: "Escape" })).toBe(true);
    expect(fireEvent.keyDown(first, { key: "F2" })).toBe(true);
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

  it("preserves partial selections and text carets, but navigates horizontally at boundaries or a full selection", () => {
    render(<div onKeyDown={onGridNavigationKeyDown}>
      <input aria-label="First paper" defaultValue="42" data-grid-row="0" data-grid-column="0" />
      <input aria-label="Second paper" defaultValue="123" data-grid-row="0" data-grid-column="1" />
    </div>);
    const cell = screen.getByLabelText("First paper") as HTMLInputElement;
    const next = screen.getByLabelText("Second paper") as HTMLInputElement;
    cell.focus(); cell.setSelectionRange(1, 1);
    expect(fireEvent.keyDown(cell, { key: "ArrowLeft" })).toBe(true);
    expect(fireEvent.keyDown(cell, { key: "ArrowRight" })).toBe(true);
    cell.setSelectionRange(2, 2);
    fireEvent.keyDown(cell, { key: "ArrowRight" }); expect(next).toHaveFocus();
    expect([next.selectionStart, next.selectionEnd]).toEqual([0, 3]);
    next.setSelectionRange(0, 2);
    expect(fireEvent.keyDown(next, { key: "ArrowLeft" })).toBe(true);
    next.select(); fireEvent.keyDown(next, { key: "ArrowLeft" }); expect(cell).toHaveFocus();
    expect([cell.selectionStart, cell.selectionEnd]).toEqual([0, 2]);
    expect(cell).toHaveValue("42");
  });

  it("supports uninterrupted 40-student entry and selects saved marks for replacement without saving", async () => {
    const user = userEvent.setup();
    const submit = jest.fn(event => event.preventDefault());
    function Marks() {
      const [scores, setScores] = useState<Record<number, string>>({ 1: '12', 2: 'X', 3: 'Y' });
      return <form onKeyDown={onGridNavigationKeyDown} onSubmit={submit}>
        {Array.from({ length: 40 }, (_, row) => <input key={row} aria-label={`Student ${row}`}
          data-grid-row={row} data-grid-column="0" value={scores[row] ?? ''}
          onChange={event => setScores(values => ({ ...values, [row]: event.target.value }))} />)}
        <button>Submit marks</button>
      </form>;
    }
    render(<Marks />);
    await user.click(screen.getByLabelText('Student 0'));
    await user.keyboard('67{ArrowDown}72{ArrowDown}81{ArrowDown}56{ArrowUp}');
    expect(screen.getByLabelText('Student 2')).toHaveFocus();
    ['67', '72', '81', '56'].forEach((value, row) => expect(screen.getByLabelText(`Student ${row}`)).toHaveValue(value));
    await user.keyboard('X{Enter}Y{Shift>}{Enter}{/Shift}');
    expect(screen.getByLabelText('Student 2')).toHaveFocus();
    expect(screen.getByLabelText('Student 2')).toHaveValue('X');
    expect(screen.getByLabelText('Student 3')).toHaveValue('Y');
    await user.tab(); expect(screen.getByLabelText('Student 3')).toHaveFocus();
    await user.tab({ shift: true }); expect(screen.getByLabelText('Student 2')).toHaveFocus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    for (let row = 4; row < 40; row++) await user.keyboard(`${row}{ArrowDown}`);
    expect(screen.getByLabelText('Student 39')).toHaveFocus();
    for (let row = 4; row < 40; row++) expect(screen.getByLabelText(`Student ${row}`)).toHaveValue(String(row));
    await user.keyboard('{Enter}'); expect(submit).not.toHaveBeenCalled();
  });

  it("uses the current filtered rows and skips readonly, hidden and disabled cells", () => {
    const cells = (filtered: boolean) => <div onKeyDown={onGridNavigationKeyDown}>
      <input key="first" aria-label="First" data-grid-row="0" data-grid-column="0" />
      {!filtered && <input key="filtered" aria-label="Filtered" data-grid-row="1" data-grid-column="0" />}
      <input key="readonly" aria-label="Read only" readOnly data-grid-row="2" data-grid-column="0" />
      <input key="hidden" aria-label="Hidden" hidden data-grid-row="3" data-grid-column="0" />
      <input key="disabled" aria-label="Disabled" disabled data-grid-row="4" data-grid-column="0" />
      <input key="last" aria-label="Last" data-grid-row="5" data-grid-column="0" defaultValue="72" />
    </div>;
    const { rerender } = render(cells(false));
    const first = screen.getByLabelText('First'); first.focus();
    fireEvent.keyDown(first, { key: 'ArrowDown' }); expect(screen.getByLabelText('Filtered')).toHaveFocus();
    rerender(cells(true)); first.focus();
    fireEvent.keyDown(first, { key: 'ArrowDown' }); expect(screen.getByLabelText('Last')).toHaveFocus();
    fireEvent.keyDown(screen.getByLabelText('Last'), { key: 'ArrowUp' }); expect(first).toHaveFocus();
  });

  it("preserves IME composition, modified arrows, native widgets and child-handled events in a grid", () => {
    render(<div onKeyDown={onGridNavigationKeyDown}>
      <input aria-label="Score" data-grid-row="0" data-grid-column="0" />
      <input aria-label="Next" data-grid-row="1" data-grid-column="0" />
      <input aria-label="Handled" data-grid-row="2" data-grid-column="0" onKeyDown={event => event.preventDefault()} />
    </div>);
    const cell = screen.getByLabelText('Score'); cell.focus();
    for (const modifiers of [{ isComposing: true }, { keyCode: 229 }, { ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }]) {
      expect(fireEvent.keyDown(cell, { key: 'ArrowDown', ...modifiers })).toBe(true);
      expect(cell).toHaveFocus();
    }
    expect(fireEvent.keyDown(cell, { key: 'Tab' })).toBe(true);
    const handled = screen.getByLabelText('Handled'); handled.focus();
    fireEvent.keyDown(handled, { key: 'ArrowUp' }); expect(handled).toHaveFocus();
  });
});
