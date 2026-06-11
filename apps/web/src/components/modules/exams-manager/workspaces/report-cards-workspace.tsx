"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, FileText, Send, Download, MessageSquare, Eye, Edit, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function ReportCardsWorkspace({ model }: { model: any }) {
  const { data: cards, isLoading, error } = useSchoolQuery<any[]>("/exams/report-cards");
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Outputs"
          title="Report Cards"
          description="Generate report cards, manage teacher comments, and compile attendance data."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><MessageSquare className="mr-2 h-4 w-4" /> Bulk Comments</Button>
          <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Download All PDFs</Button>
          <Button variant="outline"><Send className="mr-2 h-4 w-4" /> Send to Approval</Button>
          <Button><FileText className="mr-2 h-4 w-4" /> Generate Reports</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Class Teacher</TableHead>
                <TableHead>Principal Comment</TableHead>
                <TableHead>Attendance Data</TableHead>
                <TableHead>Fee Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading report cards...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-destructive">
                    Error loading report cards: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && cards?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No report cards generated yet.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && cards && cards.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">Student: {row.student_id}</TableCell>
                  <TableCell>Series: {row.exam_series_id}</TableCell>
                  <TableCell className="text-success">Done</TableCell>
                  <TableCell className="text-success">Done</TableCell>
                  <TableCell>Complete</TableCell>
                  <TableCell>Cleared</TableCell>
                  <TableCell>
                    <Badge variant={row.status === 'published' ? 'success' : 'secondary'}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> Preview Report</DropdownMenuItem>
                        <DropdownMenuItem><Edit className="mr-2 h-4 w-4" /> Edit Comments</DropdownMenuItem>
                        <DropdownMenuItem><Download className="mr-2 h-4 w-4" /> Download PDF</DropdownMenuItem>
                        <DropdownMenuItem><Send className="mr-2 h-4 w-4" /> Submit for Approval</DropdownMenuItem>
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
