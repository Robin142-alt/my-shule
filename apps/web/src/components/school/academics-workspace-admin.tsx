import { buildBillingApiPath } from "@/lib/data/school-api-config";
import Link from "next/link";
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { SchoolPageHeader } from "@/components/school/school-page-header";
import { MetricGrid } from "@/components/experience/metric-grid";
import { StatusPill } from "@/components/ui/status-pill";
import { getSchoolWorkspace, type SchoolExperienceRole, buildSchoolStudentHref } from "@/lib/experiences/school-data";

import type { SchoolRouteMode } from "@/components/school/school-pages";
export function SchoolAcademicsPage({
  role,
  tenantSlug,
}: {
  role: SchoolExperienceRole;
  tenantSlug?: string | null;
}) {
  const { model } = getSchoolWorkspace(role, tenantSlug);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      setSummaryLoading(true);
      try {
        const response = await fetch(buildBillingApiPath("/api/academics/summary", tenantSlug), {
          cache: "no-store",
        });
        if (response.ok) {
          setSummaryData(await response.json());
        }
      } catch (e) {
      } finally {
        setSummaryLoading(false);
      }
    }
    loadSummary();
  }, [tenantSlug]);

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        eyebrow="Academics"
        title="CBC academics"
        description="Marks entry, subject oversight, report cards, and classroom performance in a structure that feels familiar to schools."
      />
      {!summaryLoading && summaryData ? (
        <MetricGrid
          columns="three"
          items={[
            {
              id: "exam",
              label: "Next Exam",
              value: summaryData.nextExam || "Not scheduled",
              helper: "Upcoming assessments",
              trend: "Stable",
            },
            {
              id: "grading",
              label: "Grading Queue",
              value: summaryData.gradingQueue || "0 pending",
              helper: "Assignments to grade",
            },
            {
              id: "performance",
              label: "Performance Trend",
              value: summaryData.performanceTrend || "Stable",
              helper: "School-wide average",
              trend: "Stable",
            },
          ]}
        />
      ) : (
        <MetricGrid
          items={model.academics.summary.map((item) => ({
            id: item.id,
            label: item.label,
            value: item.value,
            helper: item.helper,
          }))}
        />
      )}
      <Tabs
        items={[
          {
            id: "subjects",
            label: "Subjects",
            panel: (
              <DataTable
                columns={[
                  { id: "subject", header: "Subject", render: (row) => row.subject },
                  { id: "teacher", header: "Teacher", render: (row) => row.teacher },
                  { id: "className", header: "Class", render: (row) => row.className },
                  { id: "average", header: "Average", render: (row) => row.average, className: "text-right font-semibold", headerClassName: "text-right" },
                ]}
                rows={model.academics.subjects}
                getRowKey={(row) => row.id}
              />
            ),
          },
          {
            id: "marks",
            label: "Marks entry",
            panel: (
              <DataTable
                columns={[
                  { id: "student", header: "Student", render: (row) => row.student },
                  { id: "english", header: "English", render: (row) => row.english, className: "text-right", headerClassName: "text-right" },
                  { id: "maths", header: "Maths", render: (row) => row.maths, className: "text-right", headerClassName: "text-right" },
                  { id: "science", header: "Science", render: (row) => row.science, className: "text-right", headerClassName: "text-right" },
                  { id: "socialStudies", header: "SST", render: (row) => row.socialStudies, className: "text-right", headerClassName: "text-right" },
                ]}
                rows={model.academics.marks}
                getRowKey={(row) => row.id}
              />
            ),
          },
          {
            id: "report-cards",
            label: "Report cards",
            panel: (
              <DataTable
                columns={[
                  { id: "learner", header: "Learner", render: (row) => row.learner },
                  { id: "className", header: "Class", render: (row) => row.className },
                  { id: "reportType", header: "Report", render: (row) => row.reportType },
                  { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.statusTone} /> },
                ]}
                rows={model.academics.reports}
                getRowKey={(row) => row.id}
              />
            ),
          },
        ]}
      />
    </div>
  );
}