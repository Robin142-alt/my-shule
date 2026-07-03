"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Upload, Download, CheckCircle, FileText, Send, Bell, AlertCircle, PlayCircle, Eye, Edit, Archive, UserX, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { downloadCsvFile } from "@/lib/dashboard/export";

interface ExamStats {
  total_series?: number | string;
  draft_marks?: number;
  pending_moderations?: number;
  published_reports?: number;
}

interface ExamSeries {
  id?: string;
  name: string;
  status?: string;
}

interface ApiResponse<T> {
  data?: T;
}

export function OverviewWorkspace({ model }: { model: unknown }) {
  void model;
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const { data: statsResponse, isLoading, error } = useSchoolQuery<ApiResponse<ExamStats> | ExamStats>("/exams/dashboard-stats");
  const { data: seriesResponse } = useSchoolQuery<ApiResponse<ExamSeries[]> | ExamSeries[]>("/exams/series");

  const stats = unwrapApiResponse(statsResponse) ?? {};
  const series = unwrapApiResponse(seriesResponse) ?? [];
  const routeTo = (workspace: string) => router.push(`/school/exams-manager/${workspace}`);

  function downloadMarksTemplate() {
    downloadCsvFile({
      filename: `marks-entry-template-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: ["admission_number", "student_name", "exam", "class", "subject", "score", "max_score", "teacher_comment"],
      rows: [["", "", "", "", "", "", "100", ""]],
    });
    setNotice("Marks template downloaded for the current school exam workflow.");
  }

  async function updateExamLifecycle(exam: ExamSeries | undefined, status: "published" | "archived") {
    if (!exam?.id) {
      setNotice("Select a persisted exam series before changing its lifecycle.");
      return;
    }
    setSavingAction(`${status}:${exam.id}`);
    try {
      await requestDashboardApi("/api/exams/lifecycle", {
        method: "POST",
        body: {
          id: exam.id,
          status,
        },
      });
      setNotice(`Exam series ${exam.name} moved to ${status}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update the exam lifecycle.");
    } finally {
      setSavingAction(null);
    }
  }

  function handleExamAction(action: string, exam?: ExamSeries) {
    const examName = exam?.name ?? "selected exam";
    switch (action) {
      case "view":
        setNotice(`Navigating to exam overview for ${examName}.`);
        routeTo("exam-setup");
        break;
      case "edit":
        setNotice(`Navigating to edit workspace for ${examName}.`);
        routeTo("exam-setup");
        break;
      case "marks":
        routeTo("marks-monitor");
        break;
      case "validate":
        routeTo("moderation");
        break;
      case "reports":
        routeTo("report-cards");
        break;
      case "approval":
        routeTo("approvals-publishing");
        break;
      case "publish":
        void updateExamLifecycle(exam, "published");
        break;
      case "archive":
        void updateExamLifecycle(exam, "archived");
        break;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Exam Manager Dashboard"
        title="Overview"
        description="Monitor exam readiness, marks entry progress, validation issues, approvals, and report card publishing."
      />
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {isLoading && <div className="col-span-full py-10 flex flex-col items-center"><Loader2 className="h-6 w-6 animate-spin mb-2" /> Loading stats...</div>}
        {error && <div className="col-span-full py-10 text-destructive text-center">Failed to load dashboard stats</div>}
        {!isLoading && !error && [
          { label: "Active Exams", value: stats?.total_series || "0", desc: "Ongoing sessions" },
          { label: "Pending Marks", value: stats?.draft_marks || "0", desc: "Awaiting entry" },
          { label: "Flagged Results", value: stats?.pending_moderations || "0", desc: "Require moderation" },
          { label: "Report Cards Ready", value: stats?.published_reports || "0", desc: "To be published" },
        ].map((card, idx) => (
          <Card key={idx} className="p-5 cursor-pointer hover:bg-muted/50 transition-colors">
            <p className="eyebrow">{card.label}</p>
            <p className="mt-3 metric-value">{card.value}</p>
            <p className="mt-2 text-[13px] text-muted">{card.desc}</p>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="p-5 border-b">
              <h3 className="text-lg font-semibold">Active Exam Sessions</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam Name</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Classes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Marks Progress</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(series) && series.map((exam, idx) => (
                    <TableRow key={exam.id ?? idx}>
                      <TableCell className="font-medium">{exam.name}</TableCell>
                      <TableCell>Term</TableCell>
                      <TableCell>All</TableCell>
                      <TableCell>
                        <Badge variant={exam.status === 'published' ? 'success' : 'secondary'}>{exam.status}</Badge>
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleExamAction("view", exam)}><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExamAction("edit", exam)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExamAction("marks", exam)}><PlayCircle className="mr-2 h-4 w-4" /> Open Marks Entry</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExamAction("validate", exam)}><CheckCircle className="mr-2 h-4 w-4" /> Validate Results</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExamAction("reports", exam)}><FileText className="mr-2 h-4 w-4" /> Generate Report Cards</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExamAction("approval", exam)}><Send className="mr-2 h-4 w-4" /> Submit for Approval</DropdownMenuItem>
                            <DropdownMenuItem disabled={!!savingAction} onClick={() => handleExamAction("publish", exam)}><Send className="mr-2 h-4 w-4" /> Publish</DropdownMenuItem>
                            <DropdownMenuItem disabled={!!savingAction} className="text-destructive" onClick={() => handleExamAction("archive", exam)}><Archive className="mr-2 h-4 w-4" /> Archive</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!series || series.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No active exam sessions</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="p-5 border-b">
              <h3 className="text-lg font-semibold">Urgent Exam Tasks</h3>
            </div>
            <div className="p-0 divide-y">
              {(stats.pending_moderations ?? 0) > 0 && (
                <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-warning/10 text-warning">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{stats.pending_moderations} report cards awaiting moderation</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => routeTo("moderation")}>Review</Button>
                </div>
              )}
              {(stats.draft_marks ?? 0) > 0 && (
                <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-destructive/10 text-destructive">
                      <UserX className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{stats.draft_marks} missing marks entries</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => routeTo("marks-monitor")}>Monitor</Button>
                </div>
              )}
              {(stats.published_reports ?? 0) > 0 && (
                <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-success/10 text-success">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{stats.published_reports} published reports ready for parents</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => routeTo("approvals-publishing")}>View</Button>
                </div>
              )}
              {!stats?.pending_moderations && !stats?.draft_marks && !stats?.published_reports && (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No urgent tasks at the moment.
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button className="w-full justify-start" variant="outline" onClick={() => routeTo("exam-setup")}>
                <Plus className="mr-2 h-4 w-4" /> Create New Exam
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => routeTo("imports-templates")}>
                <Upload className="mr-2 h-4 w-4" /> Upload Marks CSV
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={downloadMarksTemplate}>
                <Download className="mr-2 h-4 w-4" /> Download Marks Template
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => routeTo("marks-monitor")}>
                <PlayCircle className="mr-2 h-4 w-4" /> Open Marks Window
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => routeTo("moderation")}>
                <CheckCircle className="mr-2 h-4 w-4" /> Validate All Results
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => routeTo("report-cards")}>
                <FileText className="mr-2 h-4 w-4" /> Generate Report Cards
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => routeTo("approvals-publishing")}>
                <Send className="mr-2 h-4 w-4" /> Submit to Principal
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => routeTo("approvals-publishing")}>
                <CheckCircle className="mr-2 h-4 w-4" /> Publish Approved Results
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => routeTo("communication-exam")}>
                <Bell className="mr-2 h-4 w-4" /> Send Parent Notice
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function unwrapApiResponse<T>(response: ApiResponse<T> | T | undefined): T | undefined {
  return response && typeof response === "object" && "data" in response ? (response as ApiResponse<T>).data : (response as T | undefined);
}
