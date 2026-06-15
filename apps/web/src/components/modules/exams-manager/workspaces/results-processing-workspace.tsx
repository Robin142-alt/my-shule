"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlayCircle, BarChart, RotateCcw, FileSpreadsheet, Activity, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function ResultsProcessingWorkspace({ model }: { model: any }) {
  const { data: batchesResponse, isLoading, error } = useSchoolQuery<any>("/exams/report-card-batches");
  const batches = batchesResponse?.data || batchesResponse;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Processing"
          title="Results Processing"
          description="Compute aggregates, assign grades, and generate student rankings."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><RotateCcw className="mr-2 h-4 w-4" /> Clear Cache</Button>
          <Button variant="outline"><FileSpreadsheet className="mr-2 h-4 w-4" /> View Broadsheet</Button>
          <Button><PlayCircle className="mr-2 h-4 w-4" /> Run Processing Engine</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exam Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Total Students</TableHead>
                <TableHead className="text-success">Graded</TableHead>
                <TableHead className="text-destructive">Missing Marks</TableHead>
                <TableHead>Processing Status</TableHead>
                <TableHead>Ranking Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading processing batches...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-destructive">
                    Error loading batches: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && (!batches || !Array.isArray(batches) || batches.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No results processing batches found.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && Array.isArray(batches) && batches.map((row: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">Series: {row.exam_series_id}</TableCell>
                  <TableCell>{row.class_section_id || 'All Classes'}</TableCell>
                  <TableCell>{row.total_students}</TableCell>
                  <TableCell className="text-success">{row.completed_students}</TableCell>
                  <TableCell className="text-destructive">{row.failed_students}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === 'published' ? 'success' : 'secondary'}>{row.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">Pending</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Activity className="mr-2 h-4 w-4" /> Compute Aggregates</DropdownMenuItem>
                        <DropdownMenuItem><BarChart className="mr-2 h-4 w-4" /> Compute Rankings</DropdownMenuItem>
                        <DropdownMenuItem><FileSpreadsheet className="mr-2 h-4 w-4" /> View Broadsheet</DropdownMenuItem>
                        <DropdownMenuItem><RotateCcw className="mr-2 h-4 w-4" /> Clear Results Cache</DropdownMenuItem>
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
