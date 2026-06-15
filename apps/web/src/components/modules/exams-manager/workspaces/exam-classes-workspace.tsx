"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Copy, Users, BookOpen, Trash2, UserPlus, Eye, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function ExamClassesWorkspace({ model }: { model: any }) {
  const { data: weightingsResponse, isLoading, error } = useSchoolQuery<any>("/exams/subject-weightings");
  const weightings = weightingsResponse?.data || weightingsResponse;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Exam Scope"
          title="Exam Classes & Subjects"
          description="Define participating classes, subjects, and assigned teachers."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><Copy className="mr-2 h-4 w-4" /> Copy From Previous</Button>
          <Button variant="outline"><UserPlus className="mr-2 h-4 w-4" /> Assign Teachers</Button>
          <Button><Plus className="mr-2 h-4 w-4" /> Add Class</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Stream</TableHead>
                <TableHead>Curriculum</TableHead>
                <TableHead>Subjects</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Class Teacher</TableHead>
                <TableHead>Setup Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading subjects configuration...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-destructive">
                    Error loading subjects: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && (!weightings || !Array.isArray(weightings) || weightings.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No classes or subjects configured yet.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && Array.isArray(weightings) && weightings.map((row: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">Class/Subject Setup</TableCell>
                  <TableCell>N/A</TableCell>
                  <TableCell>Standard</TableCell>
                  <TableCell>Subject ID: {row.subject_id}</TableCell>
                  <TableCell>Weight: {row.weight}</TableCell>
                  <TableCell>Compulsory: {row.is_compulsory ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <Badge variant="default">Configured</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                        <DropdownMenuItem><BookOpen className="mr-2 h-4 w-4" /> Manage Subjects</DropdownMenuItem>
                        <DropdownMenuItem><UserPlus className="mr-2 h-4 w-4" /> Assign Subject Teachers</DropdownMenuItem>
                        <DropdownMenuItem><Users className="mr-2 h-4 w-4" /> View Students</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Remove Class</DropdownMenuItem>
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
