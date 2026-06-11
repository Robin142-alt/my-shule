"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CalendarDays, Download, Printer, RefreshCw, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function ExamCalendarWorkspace({ model }: { model: any }) {
  const { data: series, isLoading, error } = useSchoolQuery<any[]>("/exams/series");
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Exam Setup"
          title="Exam Calendar"
          description="Manage institutional exam dates, entry deadlines, and result publishing timelines."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Sync Academic Calendar</Button>
          <Button variant="outline"><Printer className="mr-2 h-4 w-4" /> Print</Button>
          <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export</Button>
          <Button><Plus className="mr-2 h-4 w-4" /> Add Event</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden min-h-[600px] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">Month</Button>
            <Button variant="ghost" size="sm">Week</Button>
            <Button variant="ghost" size="sm">Class</Button>
            <Button variant="ghost" size="sm">Teacher</Button>
          </div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> June 2026
          </h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">Today</Button>
            <div className="flex gap-1">
              <Button variant="outline" size="sm">&lt;</Button>
              <Button variant="outline" size="sm">&gt;</Button>
            </div>
          </div>
        </div>
        
        {/* Mock Calendar Grid */}
        <div className="flex-1 grid grid-cols-7 grid-rows-5 border-b border-l relative">
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 flex flex-col items-center justify-center z-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p>Loading calendar...</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 bg-background/50 flex flex-col items-center justify-center z-10 text-destructive">
              <p>Error loading calendar: {error.message}</p>
            </div>
          )}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="border-r border-b p-2 text-center text-sm font-medium text-muted-foreground bg-muted/10">
              {day}
            </div>
          ))}
          {Array.from({ length: 35 }).map((_, i) => {
            const day = i - 1; // offset for month start
            const isCurrentMonth = day > 0 && day <= 30;
            
            // Map real series events to days (mock logic for demo purposes based on day of month)
            const dayEvents = series?.filter(s => {
              const startDay = new Date(s.starts_on).getDate();
              const endDay = new Date(s.ends_on).getDate();
              return isCurrentMonth && (day === startDay || day === endDay);
            }) || [];
            
            return (
              <div key={i} className={`border-r border-b p-2 min-h-[100px] ${!isCurrentMonth ? "bg-muted/5" : ""}`}>
                <span className={`text-sm ${day === 15 ? "bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center" : "text-muted-foreground"}`}>
                  {isCurrentMonth ? day : ""}
                </span>
                
                {dayEvents.map((evt, eIdx) => {
                  const isStart = new Date(evt.starts_on).getDate() === day;
                  return (
                    <div key={eIdx} className={`mt-1 p-1 text-xs rounded truncate border ${isStart ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                      {evt.name} {isStart ? '(Start)' : '(End)'}
                    </div>
                  );
                })}

                {/* Keep mock fallbacks if no real data */}
                {!isLoading && !series?.length && isCurrentMonth && day === 12 && (
                  <div className="mt-1 p-1 text-xs bg-blue-100 text-blue-800 rounded truncate border border-blue-200">
                    Midterm Exams Start
                  </div>
                )}
                {!isLoading && !series?.length && isCurrentMonth && day === 14 && (
                  <div className="mt-1 p-1 text-xs bg-red-100 text-red-800 rounded truncate border border-red-200">
                    Marks Entry Deadline
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
