"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Download, Upload, CheckCircle, Save, Edit, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function MyMarksWorkspace({ model }: { model: any }) {
  const { data: marksResponse, isLoading, error } = useSchoolQuery<any>("/exams/marks");
  const marks = marksResponse?.data || marksResponse;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Grading"
          title="My Marks Entry"
          description="Enter and submit marks for your assigned teaching subjects."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Template</Button>
          <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Upload</Button>
          <Button variant="outline"><Save className="mr-2 h-4 w-4" /> Save Draft</Button>
          <Button><CheckCircle className="mr-2 h-4 w-4" /> Submit Marks</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exam</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Paper</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Saved</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading marks...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-destructive">
                    Error loading marks: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && (!marks || !Array.isArray(marks) || marks.length === 0) && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    No marks entry records found.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && Array.isArray(marks) && marks.map((row: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell>Series: {row.exam_series_id}</TableCell>
                  <TableCell>Class: {row.class_section_id}</TableCell>
                  <TableCell className="font-medium">Subject: {row.subject_id}</TableCell>
                  <TableCell>Assessment: {row.assessment_id}</TableCell>
                  <TableCell>Student: {row.student_id}</TableCell>
                  <TableCell>{row.score}</TableCell>
                  <TableCell>{row.status === 'submitted' ? row.score : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === 'published' ? 'success' : 'secondary'}>{row.status}</Badge>
                  </TableCell>
                  <TableCell>{new Date(row.updated_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Edit className="mr-2 h-4 w-4" /> Open Mark Sheet</DropdownMenuItem>
                        <DropdownMenuItem><Download className="mr-2 h-4 w-4" /> Download Template</DropdownMenuItem>
                        <DropdownMenuItem><Upload className="mr-2 h-4 w-4" /> Upload Marks</DropdownMenuItem>
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
