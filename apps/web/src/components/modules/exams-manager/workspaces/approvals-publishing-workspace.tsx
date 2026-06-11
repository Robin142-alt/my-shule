"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Send, RotateCcw, CheckCircle, Eye, XCircle, Globe, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function ApprovalsPublishingWorkspace({ model }: { model: any }) {
  const { data: reportCards, isLoading, error } = useSchoolQuery<any[]>("/exams/report-cards?status=under_review,approved,published");
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Outputs"
          title="Approvals & Publishing"
          description="Submit finalized results to the Principal and publish approved report cards to parents."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><RotateCcw className="mr-2 h-4 w-4" /> Recall Submission</Button>
          <Button variant="outline"><Globe className="mr-2 h-4 w-4" /> Unpublish</Button>
          <Button variant="default" className="bg-success text-success-foreground hover:bg-success/90">
            <CheckCircle className="mr-2 h-4 w-4" /> Publish Approved
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exam Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Approval Status</TableHead>
                <TableHead>Publish Status</TableHead>
                <TableHead>Principal Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading approval requests...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-destructive">
                    Error loading approvals: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && reportCards?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No items pending approval or publishing.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && reportCards && reportCards.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">Series: {row.exam_series_id}</TableCell>
                  <TableCell>Student: {row.student_id}</TableCell>
                  <TableCell>System</TableCell>
                  <TableCell>
                    <Badge variant={row.status === 'approved' || row.status === 'published' ? 'success' : 'warning'}>{row.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.status === 'published' ? 'success' : 'outline'}>
                      {row.status === 'published' ? 'Published' : 'Awaiting Publish'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">-</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View Results</DropdownMenuItem>
                        <DropdownMenuItem disabled={row.approval !== 'Awaiting Submission' && row.approval !== 'Returned'}><Send className="mr-2 h-4 w-4" /> Submit for Approval</DropdownMenuItem>
                        <DropdownMenuItem disabled={row.approval !== 'Approved' || row.publish === 'Published'} className="text-success"><CheckCircle className="mr-2 h-4 w-4" /> Publish to Parents</DropdownMenuItem>
                        {row.approval === 'Pending' && <DropdownMenuItem><RotateCcw className="mr-2 h-4 w-4" /> Recall Submission</DropdownMenuItem>}
                        {row.publish === 'Published' && <DropdownMenuItem className="text-destructive"><XCircle className="mr-2 h-4 w-4" /> Unpublish</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
