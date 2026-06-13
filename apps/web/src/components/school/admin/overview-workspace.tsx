"use client";

import { useSchoolQuery } from "@/lib/data/school-hooks";
import { Card } from "@/components/ui/card";
import { Users, Banknote, BookOpen, Activity, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OverviewWorkspace() {
  const { data: dashboard, isLoading, error } = useSchoolQuery<any>("/api/dashboard/layout");

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        Loading dashboard overview...
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-slate-500 gap-4">
        <AlertCircle className="w-8 h-8 text-rose-500" />
        <p>Failed to load dashboard overview.</p>
      </div>
    );
  }

  const { buttons, widgets } = dashboard;

  const studentsWidget = widgets.find((w: any) => w.widget_id === "students_summary");
  const financeWidget = widgets.find((w: any) => w.widget_id === "finance_summary");
  const academicsWidget = widgets.find((w: any) => w.widget_id === "academics_summary");
  const activityWidget = widgets.find((w: any) => w.widget_id === "activity_feed");

  return (
    <div className="space-y-6">
      {/* Header and Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Overview</h2>
          <p className="text-sm text-slate-500 mt-1">Welcome back. Here is the operational summary of your school.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {buttons?.map((btn: any) => (
            <Button
              key={btn.id}
              disabled={btn.state !== "ACTIVE"}
              variant={btn.state === "ACTIVE" ? "default" : "secondary"}
              className="relative"
            >
              {btn.label}
              {btn.state === "LOCKED" && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500" title="Locked by capabilities" />
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Students Summary */}
        <Card className="p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Students
            </h3>
            {studentsWidget?.state === 'FAILED' && <AlertCircle className="w-4 h-4 text-rose-500"  />}
          </div>
          {studentsWidget?.state === 'ACTIVE' && studentsWidget.data ? (
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-slate-900">{studentsWidget.data.totalStudents}</span>
                <span className="text-sm font-medium text-emerald-600">{studentsWidget.data.trendLabel}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-500 mb-1">New Enrollments</p>
                  <p className="text-sm font-medium text-slate-900">{studentsWidget.data.newEnrollments}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Absent Today</p>
                  <p className="text-sm font-medium text-slate-900">{studentsWidget.data.absentToday}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Data unavailable.</p>
          )}
        </Card>

        {/* Finance Summary */}
        <Card className="p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-slate-900 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-500" />
              Finance
            </h3>
            {financeWidget?.state === 'FAILED' && <AlertCircle className="w-4 h-4 text-rose-500"  />}
          </div>
          {financeWidget?.state === 'ACTIVE' && financeWidget.data ? (
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-slate-900">{financeWidget.data.collectionsToday}</span>
                <span className="text-sm font-medium text-slate-500">collected today</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Outstanding</p>
                  <p className="text-sm font-medium text-slate-900">{financeWidget.data.outstandingInvoices}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Failed</p>
                  <p className="text-sm font-medium text-rose-600">{financeWidget.data.failedPayments}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Data unavailable.</p>
          )}
        </Card>

        {/* Academics Summary */}
        <Card className="p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-500" />
              Academics
            </h3>
            {academicsWidget?.state === 'FAILED' && <AlertCircle className="w-4 h-4 text-rose-500"  />}
          </div>
          {academicsWidget?.state === 'ACTIVE' && academicsWidget.data ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-slate-500">Next Exam:</span>
                <span className="text-base font-medium text-slate-900">{academicsWidget.data.nextExam}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Grading Queue</p>
                  <p className="text-sm font-medium text-slate-900">{academicsWidget.data.gradingQueue}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Performance Trend</p>
                  <p className="text-sm font-medium text-emerald-600">{academicsWidget.data.performanceTrend}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Data unavailable.</p>
          )}
        </Card>
      </div>

      {/* Activity Feed */}
      <Card className="border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-medium text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-500" />
            Recent Activity
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {activityWidget?.state === 'ACTIVE' && activityWidget.data && Array.isArray(activityWidget.data) && activityWidget.data.length > 0 ? (
            activityWidget.data.map((item: any) => (
              <div key={item.id} className="p-4 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="mt-1">
                  {item.category === 'payment' ? <Banknote className="w-4 h-4 text-emerald-500" /> :
                   item.category === 'student' ? <Users className="w-4 h-4 text-blue-500" /> :
                   <CheckCircle className="w-4 h-4 text-slate-400" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.detail}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium text-slate-500 flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" />
                    {item.timeLabel}
                  </span>
                  <span className="text-xs text-slate-400 block mt-0.5">{item.actor}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-500">
              No recent activity found.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}


