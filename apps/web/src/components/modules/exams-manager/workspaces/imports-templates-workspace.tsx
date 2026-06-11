"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Download, Upload, CheckCircle, FileSpreadsheet, RotateCcw, AlertTriangle, Eye, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function ImportsTemplatesWorkspace({ model }: { model: any }) {
  const { data: assessments, isLoading, error } = useSchoolQuery<any[]>("/exams/assessments");
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Data Management"
          title="Imports & Templates"
          description="Download CSV templates and securely bulk upload exam data."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Download Templates</Button>
          <Button><Upload className="mr-2 h-4 w-4" /> Upload CSV/Excel</Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Marks Templates", desc: "For raw or graded marks", icon: FileSpreadsheet },
          { label: "Attendance Uploads", desc: "Bulk attendance registers", icon: FileSpreadsheet },
          { label: "Paper Structures", desc: "Configure components", icon: FileSpreadsheet },
          { label: "Report Comments", desc: "Bulk teacher comments", icon: FileSpreadsheet },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card key={idx} className="p-5 flex flex-col justify-between cursor-pointer hover:bg-muted/50 transition-colors h-[120px]">
              <div>
                <p className="font-medium flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" /> {card.label}</p>
                <p className="text-sm text-muted-foreground mt-1">{card.desc}</p>
              </div>
              <Button variant="ghost" size="sm" className="w-fit -ml-3 text-primary">Download</Button>
            </Card>
          );
        })}
      </section>

      <Card className="p-0 overflow-hidden">
        <div className="p-5 border-b">
          <h3 className="text-lg font-semibold">Import History</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead className="text-center">Found</TableHead>
                <TableHead className="text-center text-success">Valid</TableHead>
                <TableHead className="text-center text-destructive">Failed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading template imports...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-destructive">
                    Error loading imports: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && assessments?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    No active template imports found.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && assessments && assessments.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{row.name.toLowerCase().replace(/ /g, '_')}_marks.csv</TableCell>
                  <TableCell>Marks</TableCell>
                  <TableCell>System Admin</TableCell>
                  <TableCell className="text-center">100</TableCell>
                  <TableCell className="text-center text-success">100</TableCell>
                  <TableCell className="text-center text-destructive">0</TableCell>
                  <TableCell>
                    <Badge variant="success">Imported</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground text-sm">{new Date(row.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                        <DropdownMenuItem disabled={true}><CheckCircle className="mr-2 h-4 w-4" /> Import Valid Rows</DropdownMenuItem>
                        <DropdownMenuItem><Download className="mr-2 h-4 w-4" /> Download Original</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive"><RotateCcw className="mr-2 h-4 w-4" /> Rollback</DropdownMenuItem>
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
