"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Copy, Upload, Download, Archive, Edit, Settings, Trash2, CalendarDays, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function ExamSetupWorkspace({ model }: { model: any }) {
  const { data: assessments, isLoading, error } = useSchoolQuery<any[]>("/exams/assessments");
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Exam Configuration"
          title="Exam Setup"
          description="Create and manage exam sessions, assessment weights, and entry rules."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Import Setup</Button>
          <Button variant="outline"><Copy className="mr-2 h-4 w-4" /> Duplicate</Button>
          <Button variant="outline"><Archive className="mr-2 h-4 w-4" /> Archive</Button>
          <Button><Plus className="mr-2 h-4 w-4" /> Create Exam</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exam Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Curriculum</TableHead>
                <TableHead>Classes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Marks Window</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading exam configuration...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-destructive">
                    Error loading setup: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && assessments?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No exam configurations found.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && assessments && assessments.map((exam, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{exam.name}</TableCell>
                  <TableCell>{exam.assessment_type || 'Custom'}</TableCell>
                  <TableCell className="whitespace-nowrap">{exam.exam_series_id}</TableCell>
                  <TableCell>Any</TableCell>
                  <TableCell>All Forms</TableCell>
                  <TableCell>
                    <Badge variant="default">Active</Badge>
                  </TableCell>
                  <TableCell>Open</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Edit className="mr-2 h-4 w-4" /> Edit Configuration</DropdownMenuItem>
                        <DropdownMenuItem><Settings className="mr-2 h-4 w-4" /> Configure Subjects</DropdownMenuItem>
                        <DropdownMenuItem><CalendarDays className="mr-2 h-4 w-4" /> Marks Window</DropdownMenuItem>
                        <DropdownMenuItem><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete Draft</DropdownMenuItem>
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
