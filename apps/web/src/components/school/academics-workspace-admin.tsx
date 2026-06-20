import { buildBillingApiPath } from "@/lib/data/school-api-config";
"use client";

import { useState, useEffect } from "react";
import { Tabs } from "@/components/ui/tabs";
import { SchoolPageHeader } from "@/components/school/school-page-header";
import { MetricGrid } from "@/components/experience/metric-grid";
import { getSchoolWorkspace, type SchoolExperienceRole } from "@/lib/experiences/school-data";
import { AcademicSetup } from "@/components/modules/academics/AcademicSetup";
import { MarksEntryTable } from "@/components/modules/exams/MarksEntryTable";
import { ReportCardGenerator } from "@/components/modules/exams/ReportCardGenerator";


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
            id: "setup",
            label: "Academic Setup",
            panel: <AcademicSetup tenantId={tenantSlug || undefined} />,
          },
          {
            id: "marks",
            label: "Marks Entry",
            panel: (
              <MarksEntryTable 
                tenantId={tenantSlug || undefined} 
                examSeriesId="series-uuid" 
                assessmentId="assessment-uuid" 
                classSectionId="class-uuid" 
                subjectId="subject-uuid" 
                academicTermId="term-uuid" 
              />
            ),
          },
          {
            id: "report-cards",
            label: "Publish Reports",
            panel: (
              <ReportCardGenerator 
                tenantId={tenantSlug || undefined} 
                examSeriesId="series-uuid" 
              />
            ),
          },
        ]}
      />
    </div>
  );
}