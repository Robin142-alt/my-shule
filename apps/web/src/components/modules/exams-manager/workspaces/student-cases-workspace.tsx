"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, CheckCircle, HelpCircle, Eye, ShieldAlert, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function StudentCasesWorkspace({ model }: { model: any }) {
  const { data: casesResponse, isLoading, error } = useSchoolQuery<any>("/exams/student-cases");
  const cases = casesResponse?.data || casesResponse;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Exceptions"
          title="Student Exam Cases"
          description="Manage exemptions, disciplinary issues, and special needs for exams."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><HelpCircle className="mr-2 h-4 w-4" /> Principal Guidance</Button>
          <Button><Plus className="mr-2 h-4 w-4" /> Log New Case</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Exam</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Case Type</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Resolution</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading student cases...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-destructive">
                    Error loading student cases: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && (!cases || !Array.isArray(cases) || cases.length === 0) && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    No student cases reported yet.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && Array.isArray(cases) && cases.map((row: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">Student {row.student_id}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>{row.exam_series_id}</TableCell>
                  <TableCell>Any</TableCell>
                  <TableCell>{row.case_type}</TableCell>
                  <TableCell>{row.reported_by_user_id}</TableCell>
                  <TableCell>
                    <Badge variant="default">Active</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.description}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                        <DropdownMenuItem><CheckCircle className="mr-2 h-4 w-4" /> Resolve Case</DropdownMenuItem>
                        <DropdownMenuItem><ShieldAlert className="mr-2 h-4 w-4" /> Request Guidance</DropdownMenuItem>
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
