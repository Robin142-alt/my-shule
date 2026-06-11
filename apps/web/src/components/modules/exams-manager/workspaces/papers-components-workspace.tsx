"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Copy, Upload, Download, Edit, Trash2, Settings, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function PapersComponentsWorkspace({ model }: { model: any }) {
  const { data: components, isLoading, error } = useSchoolQuery<any[]>("/exams/assessment-components");
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Exam Setup"
          title="Papers & Components"
          description="Configure paper structures, weighting, and grading methods for each subject."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Import</Button>
          <Button variant="outline"><Copy className="mr-2 h-4 w-4" /> Copy Structure</Button>
          <Button variant="outline"><Settings className="mr-2 h-4 w-4" /> Bulk Configure</Button>
          <Button><Plus className="mr-2 h-4 w-4" /> Add Component</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Component</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Max Marks</TableHead>
                <TableHead>Weight %</TableHead>
                <TableHead>Entry Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading components...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-destructive">
                    Error loading components: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && components?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    No components configured yet.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && components && components.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>All</TableCell>
                  <TableCell className="font-medium">Assessment: {row.assessment_id}</TableCell>
                  <TableCell>{row.component_name} ({row.component_code})</TableCell>
                  <TableCell>Theory</TableCell>
                  <TableCell>{row.max_score}</TableCell>
                  <TableCell>{row.weight}%</TableCell>
                  <TableCell>Raw Marks</TableCell>
                  <TableCell>
                    <Badge variant="default">Active</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Edit className="mr-2 h-4 w-4" /> Edit Component</DropdownMenuItem>
                        <DropdownMenuItem><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
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
