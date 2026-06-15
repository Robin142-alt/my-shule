"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Upload, Download, CheckCircle, FileText, Send, Bell, AlertCircle, PlayCircle, Eye, Edit, Archive, UserX, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function OverviewWorkspace({ model }: { model: any }) {
  const { data: statsResponse, isLoading, error } = useSchoolQuery<any>("/exams/dashboard-stats");
  const { data: seriesResponse } = useSchoolQuery<any>("/exams/series");

  const stats = statsResponse?.data || statsResponse;
  const series = seriesResponse?.data || seriesResponse;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Exam Manager Dashboard"
        title="Overview"
        description="Monitor exam readiness, marks entry progress, validation issues, approvals, and report card publishing."
      />

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
                  {Array.isArray(series) && series.map((exam: any, idx: number) => (
                    <TableRow key={idx}>
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
                            <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
                            <DropdownMenuItem><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem><PlayCircle className="mr-2 h-4 w-4" /> Open Marks Entry</DropdownMenuItem>
                            <DropdownMenuItem><CheckCircle className="mr-2 h-4 w-4" /> Validate Results</DropdownMenuItem>
                            <DropdownMenuItem><FileText className="mr-2 h-4 w-4" /> Generate Report Cards</DropdownMenuItem>
                            <DropdownMenuItem><Send className="mr-2 h-4 w-4" /> Submit for Approval</DropdownMenuItem>
                            <DropdownMenuItem disabled><Send className="mr-2 h-4 w-4" /> Publish</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive"><Archive className="mr-2 h-4 w-4" /> Archive</DropdownMenuItem>
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
              {stats?.pending_moderations > 0 && (
                <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-warning/10 text-warning">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{stats.pending_moderations} report cards awaiting moderation</span>
                  </div>
                  <Button variant="outline" size="sm">Review</Button>
                </div>
              )}
              {stats?.draft_marks > 0 && (
                <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-destructive/10 text-destructive">
                      <UserX className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{stats.draft_marks} missing marks entries</span>
                  </div>
                  <Button variant="outline" size="sm">Monitor</Button>
                </div>
              )}
              {stats?.published_reports > 0 && (
                <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-success/10 text-success">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{stats.published_reports} published reports ready for parents</span>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
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
              <Button className="w-full justify-start" variant="outline">
                <Plus className="mr-2 h-4 w-4" /> Create New Exam
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Upload className="mr-2 h-4 w-4" /> Upload Marks CSV
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Download className="mr-2 h-4 w-4" /> Download Marks Template
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <PlayCircle className="mr-2 h-4 w-4" /> Open Marks Window
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <CheckCircle className="mr-2 h-4 w-4" /> Validate All Results
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <FileText className="mr-2 h-4 w-4" /> Generate Report Cards
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Send className="mr-2 h-4 w-4" /> Submit to Principal
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <CheckCircle className="mr-2 h-4 w-4" /> Publish Approved Results
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Bell className="mr-2 h-4 w-4" /> Send Parent Notice
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
