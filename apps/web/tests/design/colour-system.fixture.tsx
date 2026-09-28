// Isolated visual QA only. No school API is called and no records are persisted.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BookOpen, LayoutDashboard, Users } from "lucide-react";
import { AppFrame } from "@/components/system/app-frame";
import { AppSidebar } from "@/components/system/app-sidebar";
import { MobileWorkspaceNavigation } from "@/components/shared/mobile-workspace-navigation";
import { SyllabusCoverageWorkspace } from "@/components/school/teacher-dashboard/syllabus-coverage-workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const nav = [
  { id: "overview", label: "Overview", group: "School", icon: LayoutDashboard },
  { id: "students", label: "Students", group: "School", icon: Users },
  { id: "syllabus", label: "Syllabus coverage", group: "Teaching", icon: BookOpen },
  ...["Attendance", "Exams", "Reports", "Communication", "Settings"].map((label) => ({ id: label, label, group: "Workspaces", icon: BookOpen })),
];

function Fixture() {
  const [menu, setMenu] = useState(false);
  const [modal, setModal] = useState(false);
  const [view, setView] = useState("syllabus");
  return <QueryClientProvider client={client}><AppFrame
    sidebar={<AppSidebar variant="school" brand={{ title: "School workspace", subtitle: "Teaching and learning" }} navItems={nav.map((item) => ({ ...item, href: `#${item.id}` }))} activeHref="#syllabus" profile={{ name: "Teacher", roleLabel: "Teacher", contextLabel: "School workspace" }} mobileOpen={menu} onClose={() => setMenu(false)} />}
    topbar={<header className="app-workspace-header mb-4">
      <div className="flex items-center justify-between gap-3"><div><p className="text-sm text-muted">Welcome back</p><h1>Teacher Dashboard</h1></div><Button variant="secondary" onClick={() => setModal(true)}>Open form</Button></div>
    </header>}
  >
    <MobileWorkspaceNavigation label="School workspace" items={nav} value={view} onValueChange={setView} />
    <SyllabusCoverageWorkspace />
    <section className="dashboard-card flex flex-wrap items-center gap-3 p-4" aria-label="Shared colours">
      <Button>Primary action</Button><Button variant="danger">Delete draft</Button><Badge variant="success">Approved</Badge><Badge variant="warning">Pending</Badge><Badge variant="destructive">Failed</Badge><Input aria-label="Workspace input" placeholder="Search records" />
    </section>
    <Modal open={modal} title="Edit details" onClose={() => setModal(false)} footer={<Button onClick={() => setModal(false)}>Save details</Button>}>
      <label className="text-sm text-foreground">Name<Input aria-label="Dialog input" placeholder="Enter a name" /></label>
      <Badge variant="warning">Pending</Badge>
    </Modal>
  </AppFrame></QueryClientProvider>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
