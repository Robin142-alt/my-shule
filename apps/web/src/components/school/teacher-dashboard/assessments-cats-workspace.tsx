import { PenTool } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { fetchPendingMarksLive } from "@/lib/modules/teacher-live";
import { downloadCsvFile, openPrintDocument } from "@/lib/dashboard/export";
import { markbookDate } from "./markbook-list";

export function AssessmentsCatsWorkspace() {
  const liveSession = useLiveTenantSession("school");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["pending-marks", liveSession.session?.tenantId, liveSession.session?.user.user_id],
    queryFn: () => fetchPendingMarksLive(liveSession.session!),
    enabled: !!liveSession.session,
  });

  const catWindows = data?.windows?.filter(w => w.examName.toLowerCase().includes('cat') || w.examName.toLowerCase().includes('assessment')) || [];

  const rows = catWindows.map(w => [
    w.examName,
    w.className,
    `${w.subjectName} · ${w.paperName}`,
    w.outOf.toString(),
    markbookDate(w.deadline),
    `${w.enteredCount} / ${w.totalStudents}`,
    w.status,
    "Use Exams Workspace"
  ]) || [];

  const openCatSetup = () => {
    openPrintDocument({
      eyebrow: "Teacher assessments",
      title: "Create CAT",
      subtitle: "Assessment setup review",
      rows: [
        { label: "Required fields", value: "Class, subject, date, out-of mark, deadline" },
        { label: "Current CAT windows", value: String(catWindows.length) },
      ],
      footer: "CAT creation must be linked to the teacher's assigned classes and subjects.",
    });
  };

  const downloadTemplate = () => {
    downloadCsvFile({
      filename: "cat-marks-template.csv",
      headers: ["admission_number", "student_name", "class", "subject", "assessment", "score", "out_of"],
      rows: [["", "", "", "", "", "", ""]],
    });
  };

  return (
    <Panel title="Assessments / CATs" description="Manage continuous assessment tests and class assessments." icon={PenTool}>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={openCatSetup} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Create CAT</button>
        <button type="button" onClick={downloadTemplate} className="rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">Import Marks</button>
        <button type="button" onClick={downloadTemplate} className="rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">Download Template</button>
      </div>
      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          Failed to load assessments. Please retry.
        </div>
      ) : (
        <RecordTable
          columns={["Assessment", "Class", "Subject", "Out Of", "Date", "Marks Entered", "Status", "Actions"]}
          rows={rows}
          emptyState={isLoading ? "Loading assessments..." : "No assessments are open yet. Open Exams & Marks after the exams manager creates an assessment window for your assigned class and subject."}
        />
      )}
    </Panel>
  );
}
