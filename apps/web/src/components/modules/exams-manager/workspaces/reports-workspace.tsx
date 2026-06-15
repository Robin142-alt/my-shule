"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer, Filter, CalendarDays, FileSpreadsheet, BarChart, TrendingUp, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function ReportsWorkspace({ model }: { model: any }) {
  const { data: seriesResponse, isLoading, error } = useSchoolQuery<any>("/exams/series");
  const series = seriesResponse?.data || seriesResponse;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Outputs"
          title="Reports & Downloads"
          description="Generate broadsheets, merit lists, and performance analytics."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><CalendarDays className="mr-2 h-4 w-4" /> Schedule Auto-Report</Button>
          <Button><Filter className="mr-2 h-4 w-4" /> Global Filters</Button>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
        {isLoading && <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading available exam series for reporting...</span>}
        {error && <span className="text-destructive">Failed to load exam series context.</span>}
        {!isLoading && !error && (!series || !Array.isArray(series)) && <span>No active exam series available for analysis.</span>}
        {!isLoading && !error && Array.isArray(series) && <span>{series.length} active exam series available for analysis.</span>}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[
          { title: "Master Broadsheet", desc: "Comprehensive grid of all student marks across all subjects.", icon: FileSpreadsheet },
          { title: "Class Merit List", desc: "Ranked list of students within a specific class or stream.", icon: BarChart },
          { title: "Subject Merit List", desc: "Ranked list of students by subject performance.", icon: BarChart },
          { title: "Subject Mean Trends", desc: "Historical comparison of subject averages across terms.", icon: TrendingUp },
          { title: "Teacher Performance Analysis", desc: "Value-add and subject mean score analysis per teacher.", icon: TrendingUp },
          { title: "Exam Attendance Summary", desc: "Aggregated statistics on exam attendance and absentees.", icon: FileSpreadsheet },
        ].map((report, idx) => {
          const Icon = report.icon;
          return (
            <Card key={idx} className="p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{report.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-6">{report.desc}</p>
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <Button className="w-full" variant="outline"><Download className="mr-2 h-4 w-4" /> Excel</Button>
                <Button className="w-full" variant="outline"><Printer className="mr-2 h-4 w-4" /> PDF</Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
