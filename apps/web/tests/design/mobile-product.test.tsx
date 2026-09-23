import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "@/components/ui/modal";
import { ActionDrawer } from "@/components/shared/action-drawer";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { RecordTable } from "@/components/ui/record-table";
import { ChartCard } from "@/components/experience/chart-card";
import { CommandMetricCard } from "@/components/ui/command-primitives";

it("closes only the top overlay and keeps the parent's scroll lock and focus", async () => {
  const user = userEvent.setup();
  function Harness() {
    const [drawer, setDrawer] = useState(false);
    const [modal, setModal] = useState(false);
    return <><button onClick={() => setDrawer(true)}>Details</button><ActionDrawer isOpen={drawer} title="Details" onClose={() => setDrawer(false)}><button onClick={() => setModal(true)}>Edit</button><Modal open={modal} onClose={() => setModal(false)} title="Edit record"><input aria-label="Name" /></Modal></ActionDrawer></>;
  }
  render(<Harness />);
  await user.click(screen.getByRole("button", { name: "Details" }));
  const drawer = screen.getByRole("dialog", { name: "Details" });
  await waitFor(() => expect(drawer).toHaveFocus());
  await user.click(within(drawer).getByRole("button", { name: "Edit" }));
  await waitFor(() => expect(screen.getByRole("dialog", { name: "Edit record" })).toHaveFocus());
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog", { name: "Edit record" })).not.toBeInTheDocument();
  expect(drawer).toBeVisible();
  expect(document.body.style.overflow).toBe("hidden");
  expect(within(drawer).getByRole("button", { name: "Edit" })).toHaveFocus();
  await user.keyboard("{Escape}");
  expect(document.body.style.overflow).toBe("");
  expect(screen.getByRole("button", { name: "Details" })).toHaveFocus();
});

it("portals compound dialogs out of clipped workspaces and traps focus", async () => {
  const user = userEvent.setup();
  const { container } = render(<div style={{ overflow: "hidden", transform: "translateZ(0)" }}><Dialog open onOpenChange={jest.fn()}><DialogContent><DialogTitle>Preview</DialogTitle><button>Download</button></DialogContent></Dialog></div>);
  const dialog = screen.getByRole("dialog", { name: "Preview" });
  expect(container.contains(dialog)).toBe(false);
  await waitFor(() => expect(dialog).toHaveFocus());
  await user.tab({ shift: true });
  expect(screen.getByRole("button", { name: "Download" })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus();
});

it("supports keyboard tab navigation and associates each tab with its panel", async () => {
  const user = userEvent.setup();
  render(<Tabs items={[{ id: "one", label: "Students", panel: "Student records" }, { id: "two", label: "Reports", panel: "Report records" }]} />);
  await user.click(screen.getByRole("tab", { name: "Students" }));
  await user.keyboard("{ArrowRight}");
  const reports = screen.getByRole("tab", { name: "Reports" });
  expect(reports).toHaveFocus();
  expect(reports).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tabpanel", { name: "Reports" })).toHaveTextContent("Report records");
  await user.keyboard("{Home}");
  expect(screen.getByRole("tab", { name: "Students" })).toHaveFocus();
});

it("keeps table actions available without a title and preserves every mobile field", () => {
  render(<DataTable actions={<button>Export</button>} rows={[{id:"one",name:"A learner"}]} getRowKey={row => row.id} columns={[{id:"name",header:"Learner",render:row => row.name}]} />);
  expect(screen.getByRole("button", { name: "Export" })).toBeVisible();
  expect(screen.getByRole("term")).toHaveTextContent("Learner");
  expect(screen.getByRole("definition")).toHaveTextContent("A learner");
});

it("keeps one interactive record while adding phone labels and preserving table semantics", async () => {
  const user = userEvent.setup();
  const edit = jest.fn();
  const rows = [{ id: "one", name: "A learner with a long name" }];
  render(<RecordTable aria-label="Learners"><thead><tr><th>Learner</th><th>Actions</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.name}</td><td><button onClick={edit}>Edit learner</button></td></tr>)}</tbody></RecordTable>);
  expect(screen.getByRole("table", { name: "Learners" })).toBeVisible();
  expect(screen.getAllByRole("columnheader")).toHaveLength(2);
  expect(screen.getAllByRole("cell")).toHaveLength(2);
  expect(screen.getAllByRole("button", { name: "Edit learner" })).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "Edit learner" }));
  expect(edit).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("cell", { name: rows[0].name }).querySelector(".app-cell-label")).toHaveTextContent("Learner");
});

it("preserves full-width empty messages and keeps complex matrices in a table", () => {
  const { rerender } = render(<RecordTable><thead><tr><th>Learner</th><th>Status</th></tr></thead><tbody><tr><td colSpan={2}>No learners found. Add the first learner.</td></tr></tbody></RecordTable>);
  const empty = screen.getByRole("cell");
  expect(empty).toHaveTextContent("No learners found. Add the first learner.");
  expect(empty.querySelector(".app-cell-label")).toBeNull();
  rerender(<RecordTable><thead><tr><th colSpan={2}>Timetable</th></tr></thead><tbody><tr><td>Monday</td><td>Mathematics</td></tr></tbody></RecordTable>);
  expect(screen.getByRole("table")).not.toHaveClass("app-record-table");
});

it("shows truthful empty analytics and does not draw a fabricated metric trend", () => {
  const { container, rerender } = render(<><ChartCard title="Revenue" subtitle="Monthly revenue" points={[]} /><CommandMetricCard label="Receipts" value="0" helper="No receipts recorded" /></>);
  expect(screen.getByText(/No data available yet/)).toBeVisible();
  expect(container.querySelector("polyline")).toBeNull();
  rerender(<ChartCard title="Revenue" subtitle="Monthly revenue" points={[{ label: "September", value: 0 }]} />);
  expect(screen.getByRole("region", { name: "Revenue chart" })).toBeVisible();
  expect(screen.getByText("September")).toBeVisible();
  expect(container.querySelector('[style="height: 0%;"]')).not.toBeNull();
});
