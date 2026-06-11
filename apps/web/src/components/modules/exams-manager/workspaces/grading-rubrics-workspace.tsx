"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Copy, Download, Upload, CheckCircle, Edit, Trash2, AlignLeft, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function GradingRubricsWorkspace({ model }: { model: any }) {
  const { data: policies, isLoading, error } = useSchoolQuery<any[]>("/exams/grading-policies");
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Configuration"
          title="Grading & Rubrics"
          description="Manage grading scales, competency rubrics, and subject-specific grade bands."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Import</Button>
          <Button variant="outline"><Copy className="mr-2 h-4 w-4" /> Copy From Previous</Button>
          <Button><Plus className="mr-2 h-4 w-4" /> Create Scale</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-5 border-b flex gap-2">
          <Button variant="secondary" size="sm">Standard Grading</Button>
          <Button variant="ghost" size="sm">CBC Rubrics</Button>
          <Button variant="ghost" size="sm">Subject Specific</Button>
          <Button variant="ghost" size="sm">Report Descriptors</Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scale Name</TableHead>
                <TableHead>Curriculum</TableHead>
                <TableHead>Target Classes</TableHead>
                <TableHead>Subject Scope</TableHead>
                <TableHead>Grade Bands</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading grading policies...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-destructive">
                    Error loading policies: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && policies?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No grading policies found.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && policies && policies.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>Standard</TableCell>
                  <TableCell>All</TableCell>
                  <TableCell>Default</TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-[200px]">View Rules...</TableCell>
                  <TableCell>
                    <Badge variant={row.status === 'active' ? 'default' : 'secondary'}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(row.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Edit className="mr-2 h-4 w-4" /> Edit Scale</DropdownMenuItem>
                        <DropdownMenuItem><AlignLeft className="mr-2 h-4 w-4" /> Edit Descriptors</DropdownMenuItem>
                        <DropdownMenuItem><CheckCircle className="mr-2 h-4 w-4" /> Set as Active</DropdownMenuItem>
                        <DropdownMenuItem><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
                        <DropdownMenuItem><Download className="mr-2 h-4 w-4" /> Export</DropdownMenuItem>
                        {row.status === 'Draft' && <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>}
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
