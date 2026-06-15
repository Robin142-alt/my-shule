"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Plus, Copy, Upload, Download, Archive, Edit, Settings, Trash2, CalendarDays, Loader2 } from "lucide-react";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";

function CreateExamDialog({ children, onSuccess }: { children: React.ReactNode, onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    academic_term_id: "",
    starts_on: "",
    ends_on: ""
  });
  
  const createMutation = useSchoolMutation("/exams/draft", "POST");
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync(formData);
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      console.error("Failed to create exam", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Exam Series</DialogTitle>
            <DialogDescription>Set up a new examination period.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Exam Name</Label>
              <Input 
                required 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                placeholder="e.g. End of Term 1" 
              />
            </div>
            <div className="space-y-2">
              <Label>Term ID</Label>
              <Input 
                required 
                value={formData.academic_term_id} 
                onChange={e => setFormData({ ...formData, academic_term_id: e.target.value })} 
                placeholder="Term UUID" 
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input 
                type="date" 
                required 
                value={formData.starts_on} 
                onChange={e => setFormData({ ...formData, starts_on: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input 
                type="date" 
                required 
                value={formData.ends_on} 
                onChange={e => setFormData({ ...formData, ends_on: e.target.value })} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Exam
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ExamSetupWorkspace({ model }: { model: any }) {
  const { data: assessmentsResponse, isLoading, error, refetch } = useSchoolQuery<any>("/exams/assessments");
  const assessments = assessmentsResponse?.data || assessmentsResponse;

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
          <CreateExamDialog onSuccess={refetch}>
            <Button><Plus className="mr-2 h-4 w-4" /> Create Exam</Button>
          </CreateExamDialog>
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
              {!isLoading && !error && (!assessments || !Array.isArray(assessments) || assessments.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No exam configurations found.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && Array.isArray(assessments) && assessments.map((exam: any, idx: number) => (
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
