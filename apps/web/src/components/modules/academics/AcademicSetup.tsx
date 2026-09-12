"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AcademicSetup({ tenantId }: { tenantId?: string }) {
  const queryClient = useQueryClient();
  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);

  const termsQuery = useQuery({
    queryKey: ["academic-terms", tenantId],
    queryFn: async () => {
      const res = await fetch(`/api/academics/terms${tenantId ? `?tenant_id=${tenantId}` : ""}`);
      if (!res.ok) throw new Error("Failed to load terms");
      return res.json();
    },
  });

  const subjectsQuery = useQuery({
    queryKey: ["academic-subjects", tenantId],
    queryFn: async () => {
      const res = await fetch(`/api/academics/subjects${tenantId ? `?tenant_id=${tenantId}` : ""}`);
      if (!res.ok) throw new Error("Failed to load subjects");
      return res.json();
    },
  });

  const createTermMutation = useMutation({
    mutationFn: async (data: { name: string; start_date: string; end_date: string }) => {
      return requestDashboardApi('/academics/terms', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-terms", tenantId] });
      setIsTermModalOpen(false);
      toast.success("Term created successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create term");
    }
  });

  const createSubjectMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      return requestDashboardApi('/academics/subjects', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-subjects", tenantId] });
      setIsSubjectModalOpen(false);
      toast.success("Subject created successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create subject");
    }
  });

  const handleCreateTerm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createTermMutation.mutate({
      name: formData.get("name") as string,
      start_date: new Date(formData.get("start_date") as string).toISOString(),
      end_date: new Date(formData.get("end_date") as string).toISOString(),
    });
  };

  const handleCreateSubject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createSubjectMutation.mutate({
      name: formData.get("name") as string,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-foreground">Academic Setup</h2>
      </div>

      <Card className="p-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="section-title">Academic Terms</h3>
            <p className="mt-1 text-[13px] text-muted">Manage the school terms for the academic year.</p>
          </div>
          <Button onClick={() => setIsTermModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Term
          </Button>
        </div>
        {termsQuery.isLoading ? (
          <div className="h-32 flex items-center justify-center border rounded-[var(--radius)]">Loading terms...</div>
        ) : (
          <DataTable
            columns={[
              { id: "name", header: "Name", render: (row: any) => row.name },
              { id: "startDate", header: "Start Date", render: (row: any) => new Date(row.start_date).toLocaleDateString() },
              { id: "endDate", header: "End Date", render: (row: any) => new Date(row.end_date).toLocaleDateString() },
            ]}
            rows={termsQuery.data || []}
            getRowKey={(row: any) => row.id}
          />
        )}
      </Card>

      <Card className="p-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="section-title">Subjects</h3>
            <p className="mt-1 text-[13px] text-muted">Manage the subjects offered at the school.</p>
          </div>
          <Button variant="outline" onClick={() => setIsSubjectModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Subject
          </Button>
        </div>
        {subjectsQuery.isLoading ? (
          <div className="h-32 flex items-center justify-center border rounded-[var(--radius)]">Loading subjects...</div>
        ) : (
          <DataTable
            columns={[
              { id: "name", header: "Subject Name", render: (row: any) => row.name },
            ]}
            rows={subjectsQuery.data || []}
            getRowKey={(row: any) => row.id}
          />
        )}
      </Card>

      <Modal open={isTermModalOpen} onClose={() => setIsTermModalOpen(false)} title="Create Academic Term">
        <form onSubmit={handleCreateTerm} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Term Name</label>
            <input name="name" required className="input-base" placeholder="e.g. Term 1 2026" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Start Date</label>
              <input type="date" name="start_date" required className="input-base" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">End Date</label>
              <input type="date" name="end_date" required className="input-base" />
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={createTermMutation.isPending}>
              {createTermMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Term
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={isSubjectModalOpen} onClose={() => setIsSubjectModalOpen(false)} title="Create Subject">
        <form onSubmit={handleCreateSubject} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Subject Name</label>
            <input name="name" required className="input-base" placeholder="e.g. Mathematics" />
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={createSubjectMutation.isPending}>
              {createSubjectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Subject
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
