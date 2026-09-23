import { useState } from "react";
import { createRoot } from "react-dom/client";
import { BookOpen, LayoutDashboard, Settings, Users, Wallet } from "lucide-react";
import { AppFrame } from "@/components/system/app-frame";
import { AppSidebar } from "@/components/system/app-sidebar";
import { MobileWorkspaceNavigation } from "@/components/shared/mobile-workspace-navigation";
import { HeaderPopover } from "@/components/shared/header-popover";
import { ActionDrawer } from "@/components/shared/action-drawer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs } from "@/components/ui/tabs";
import { Table } from "@/components/ui/table";

const items = [
  { id: "overview", label: "Overview", group: "School", icon: LayoutDashboard },
  { id: "students", label: "Students", group: "School", icon: Users },
  { id: "finance", label: "Fees & payments", group: "School", icon: Wallet },
  ...["Academics", "Attendance", "Exams", "Reports", "Communication", "Approvals", "Settings"].map((label) => ({ id: label.toLowerCase(), label, group: "Workspaces", icon: BookOpen })),
];
const rows = Array.from({ length: 12 }, (_, i) => ({ id: `${i}`, name: `Learner ${i + 1}`, admission: `ADM-2026-${i + 1}`, className: "Grade 8 · Blue", balance: "KES 12,500" }));

function Fixture() {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [workspace, setWorkspace] = useState("overview");
  const variant = (new URLSearchParams(location.search).get("variant") ?? "school") as "school" | "platform" | "portal";
  const profile = { name: "School Administrator", roleLabel: "Principal", contextLabel: "School workspace" };
  return <AppFrame
    sidebar={<AppSidebar variant={variant} brand={{ title: "MyShule", subtitle: "School workspace" }} navItems={items.map(item => ({ ...item, href: `#${item.id}` }))} activeHref="#overview" profile={profile} mobileOpen={open} onClose={() => setOpen(false)} />}
    backdrop={open && <button aria-label="Close sidebar backdrop" className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} />}
    topbar={<header className="app-workspace-header mb-4 rounded-2xl border border-border bg-white p-4">
      <div className="flex items-center justify-between gap-3"><div><p className="text-xs text-muted">MYSHULE · SCHOOL WORKSPACE</p><h1 className="mt-1 text-xl font-semibold">Your school, at a glance</h1></div><HeaderPopover label="Notifications" title="Notifications" icon={<Settings size={18} />}><p className="p-4 text-sm">You are all caught up.</p></HeaderPopover></div>
      <div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => setOpen(true)} className="lg:hidden">Open navigation</Button><Button onClick={() => setModal(true)}>Add student</Button><Button variant="outline" onClick={() => setDialog(true)}>Report preview</Button><Button variant="outline" onClick={() => setDrawer(true)}>Details</Button></div>
    </header>}
  >
    <div className="lg:hidden"><MobileWorkspaceNavigation label="School workspace" items={items} value={workspace} onValueChange={setWorkspace} /></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Students", "482"], ["Attendance", "96.8%"], ["Receipts today", "18"], ["Pending approvals", "4"]].map(([label, value]) => <Card key={label} className="p-4"><p className="text-xs text-muted">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></Card>)}</div>
    <Tabs items={["Students", "Payments", "Attendance registers", "Academic reports", "Settings"].map(label => ({ id: label, label, panel: <DataTable title="Student directory" subtitle="Current enrolment and balances" rows={rows} getRowKey={row => row.id} columns={[
      { id: "name", header: "Student", render: row => row.name },
      { id: "admission", header: "Admission", render: row => row.admission },
      { id: "class", header: "Class", render: row => row.className },
      { id: "balance", header: "Balance", render: row => row.balance },
      { id: "actions", header: "Actions", render: () => <Button size="sm" variant="outline" onClick={() => setDrawer(true)}>View record</Button> },
    ]} /> }))} />
    <Table aria-label="Detailed analysis"><thead><tr>{Array.from({length:12}, (_, i) => <th className="min-w-32 p-3" key={i}>Subject {i+1}</th>)}</tr></thead><tbody><tr>{Array.from({length:12}, (_, i) => <td className="p-3" key={i}>75%</td>)}</tr></tbody></Table>
    <Modal open={modal} title="Add student" description="Enter the learner’s details to begin admission." onClose={() => setModal(false)} footer={<><Button variant="outline" onClick={() => setModal(false)}>Cancel</Button><Button onClick={() => setModal(false)}>Save student</Button></>}>
      <form className="grid gap-4 sm:grid-cols-2">{["Full name", "Admission number", "Date of birth", "Class", "Parent name", "Phone number", "Email", "Address", "Emergency contact", "Notes"].map(label => <label key={label} className="grid gap-1.5 text-sm font-medium">{label}<Input aria-label={label} /></label>)}</form>
    </Modal>
    <Dialog open={dialog} onOpenChange={setDialog}><DialogContent><DialogHeader><DialogTitle>Report preview</DialogTitle></DialogHeader><p className="text-sm">Student progress report</p><div className="h-[600px] bg-slate-50 my-4 p-4">Preview content</div><DialogFooter><Button onClick={() => setDialog(false)}>Done</Button></DialogFooter></DialogContent></Dialog>
    <ActionDrawer isOpen={drawer} title="Student details" onClose={() => setDrawer(false)} footer={<Button onClick={() => setDrawer(false)}>Done</Button>}><p className="text-sm">Admission and parent contact details</p><Button onClick={() => setModal(true)}>Edit student</Button><div className="h-[700px]" /></ActionDrawer>
  </AppFrame>;
}

createRoot(document.getElementById("root")!).render(<Fixture />);
