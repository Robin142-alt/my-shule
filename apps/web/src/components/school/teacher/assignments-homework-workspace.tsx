// @ts-nocheck

"use client";

import { useState } from "react";
import { Plus, Check, Clock, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";

export function AssignmentsHomeworkWorkspace() {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  // Fetch real data from academics
  const { data: assignments, isLoading, refetch } = useSchoolQuery('/api/academics/my-assignments');

  const createAssignment = useSchoolMutation({
    endpoint: '/api/academics/assignments',
    method: 'POST',
    onSuccess: () => {
      refetch();
      setIsCreating(false);
      setNewTitle("");
      setNewDesc("");
      setNewDueDate("");
    }
  });

  const handleCreate = () => {
    if (!newTitle || !newDueDate) return;
    createAssignment.mutate({
      title: newTitle,
      description: newDesc,
      due_date: newDueDate,
      class_section: 'Form 1 East', // Hardcoded for demo
      subject: 'Mathematics',
      max_score: 100
    });
  };

  const activeAssignments = Array.isArray(assignments) ? assignments : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Assignments & Homework</h2>
          <p className="text-sm text-slate-500 mt-1">Manage homework tasks and view student submissions.</p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4" /> Create Assignment
        </Button>
      </div>

      {isCreating && (
        <Card className="p-4 border border-blue-200 bg-blue-50 space-y-4">
          <h3 className="font-medium text-slate-900">New Assignment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500">Title</label>
              <input 
                type="text" 
                className="w-full h-10 rounded border border-slate-200 px-3 text-sm mt-1" 
                placeholder="e.g. Algebra Worksheet"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Due Date</label>
              <input 
                type="date" 
                className="w-full h-10 rounded border border-slate-200 px-3 text-sm mt-1" 
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-slate-500">Description</label>
              <textarea 
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm mt-1 h-20" 
                placeholder="Instructions for students..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createAssignment.isPending}>
              {createAssignment.isPending ? "Saving..." : "Save Assignment"}
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-medium text-slate-900 mb-2">Active Tasks</h3>
          
          {isLoading ? (
             <Card className="p-6 border border-slate-200 text-center text-slate-500 animate-pulse">
               Loading assignments...
             </Card>
          ) : activeAssignments.length > 0 ? (
            activeAssignments.map((task: any, idx: number) => (
              <Card key={idx} className="p-4 border border-slate-200 flex flex-col md:flex-row gap-4 justify-between group hover:border-blue-200 transition-colors cursor-pointer">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">{task.title}</h4>
                    <p className="text-sm text-slate-500 mt-1">{task.class_section || 'All Sections'} • {task.subject || 'General'}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/50">
                        <Clock className="w-3 h-3" /> Due: {new Date(task.due_date || new Date()).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex md:flex-col justify-end items-end gap-2 text-sm text-slate-500">
                  <span>0/30 Submitted</span>
                  <Button variant="outline" size="sm" className="h-8 text-xs mt-2">View Submissions</Button>
                </div>
              </Card>
            ))
          ) : (
             <Card className="p-8 border border-slate-200 border-dashed text-center">
               <p className="text-slate-500">No active assignments found.</p>
               <Button variant="link" className="mt-2" onClick={() => setIsCreating(true)}>Create one now</Button>
             </Card>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-slate-900 mb-2">Needs Grading</h3>
          <Card className="border border-slate-200 p-0 overflow-hidden bg-slate-50/50">
            <div className="p-8 text-center text-slate-500">
              <Check className="w-8 h-8 mx-auto mb-3 text-emerald-400" />
              <p className="text-sm">All caught up! No assignments waiting to be graded.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

