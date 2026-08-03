"use client";

import { MyShuleMark } from "@/components/brand/myshule-brand";
import { IntegratedSchoolCommandHeader } from "@/components/school/integrated-school-command-header";

import { Calendar, BookOpen, GraduationCap, Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function StudentCommandCenter({ routeMode, activeSection }: { routeMode?: "hosted" | "public", activeSection?: string }) {
  const { data: response, isLoading } = useSchoolQuery<any>("/api/student/dashboard");
  const dashboard = response?.data || response;

  return (
    <div className="min-h-screen bg-[#F3F6FA]">
      <div className="mx-auto max-w-7xl p-4 lg:p-6">
        
        {/* Main Content */}
        <main className="w-full">
          <div className="min-h-[calc(100vh-3rem)] rounded-2xl bg-white shadow-[0_2px_40px_rgba(7,29,73,0.04)] overflow-hidden">
            
            <header className="sticky top-0 z-20 border-b border-[#D8E0EC] bg-[#F3F6FA]/90 px-4 py-4 backdrop-blur sm:px-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <MyShuleMark size={48} />
                  <div>
                    <h1 className="text-lg font-black text-[#071D49]">Student workspace controls</h1>
                    <p className="text-sm font-semibold text-[#64748B]">
                      {isLoading ? "Loading..." : `${dashboard?.profile?.className || "Grade 10"} ${dashboard?.profile?.streamName || "West"} • Admission No: ${dashboard?.profile?.admissionNumber || "N/A"}`}
                    </p>
                  </div>
                </div>
              </div>
            </header>

            <div className="p-4 sm:p-8">
              <IntegratedSchoolCommandHeader
                roleTitle="Student Dashboard"
                fallbackUserLabel={dashboard?.profile?.name || "Student"}
                contextLabel="student portal"
                className="mb-6"
              />
              <div className="grid gap-6 md:grid-cols-4 mb-8">
                <Card className="p-6 border-l-4 border-l-blue-500">
                  <div className="flex items-center gap-3 text-blue-600 mb-2">
                    <Calendar className="h-5 w-5" />
                    <span className="font-bold">Next Class</span>
                  </div>
                  <div className="text-2xl font-black text-[#071D49]">
                    {isLoading ? "..." : dashboard?.academics?.nextClass || "No Class"}
                  </div>
                  <div className="text-sm font-semibold text-gray-500">
                    {isLoading ? "..." : `${dashboard?.academics?.nextClassTime || "11:00 AM"} • ${dashboard?.academics?.nextClassRoom || "Room 4"}`}
                  </div>
                </Card>

                <Card className="p-6 border-l-4 border-l-orange-500">
                  <div className="flex items-center gap-3 text-orange-600 mb-2">
                    <BookOpen className="h-5 w-5" />
                    <span className="font-bold">Assignments</span>
                  </div>
                  <div className="text-2xl font-black text-[#071D49]">
                    {isLoading ? "..." : `${dashboard?.metrics?.pendingAssignments ?? dashboard?.assignments?.pendingCount ?? 0} Due`}
                  </div>
                  <div className="text-sm font-semibold text-gray-500">Pending tasks</div>
                </Card>

                <Card className="p-6 border-l-4 border-l-green-500">
                  <div className="flex items-center gap-3 text-green-600 mb-2">
                    <GraduationCap className="h-5 w-5" />
                    <span className="font-bold">Attendance</span>
                  </div>
                  <div className="text-2xl font-black text-[#071D49]">
                    {isLoading ? "..." : `${dashboard?.metrics?.attendanceRate ?? dashboard?.attendance?.percentage ?? 95}%`}
                  </div>
                  <div className="text-sm font-semibold text-gray-500">This Term</div>
                </Card>

                <Card className="p-6 border-l-4 border-l-purple-500">
                  <div className="flex items-center gap-3 text-purple-600 mb-2">
                    <Award className="h-5 w-5" />
                    <span className="font-bold">Average Grade</span>
                  </div>
                  <div className="text-2xl font-black text-[#071D49]">
                    {isLoading ? "..." : dashboard?.metrics?.averageGrade ?? "B+"}
                  </div>
                  <div className="text-sm font-semibold text-gray-500">
                    {isLoading ? "..." : dashboard?.exams?.latestTitle || "Overall average"}
                  </div>
                </Card>
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-[#071D49] mb-4">My Timetable (Today)</h2>
                  <div className="space-y-4">
                    {isLoading ? (
                      <div className="p-4 text-center text-gray-500 text-sm">Loading timetable...</div>
                    ) : dashboard?.timetableToday?.length > 0 ? (
                      dashboard.timetableToday.map((slot: any, idx: number) => {
                        const isNow = slot.status === "Now";
                        const isDone = slot.status === "Completed";
                        return (
                          <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${
                            isNow ? "bg-blue-50 border-blue-100" : isDone ? "bg-gray-50 border-gray-100" : "border-gray-100"
                          }`}>
                            <div>
                              <div className={`font-bold ${isNow ? "text-blue-900" : isDone ? "text-[#071D49]" : "text-gray-600"}`}>
                                {slot.time}
                              </div>
                              <div className={`text-sm ${isNow ? "text-blue-700" : isDone ? "text-gray-600" : "text-gray-500"}`}>
                                {slot.subject}
                              </div>
                            </div>
                            <span className={`px-2 py-1 text-xs font-bold rounded ${
                              isNow ? "bg-blue-200 text-blue-800 animate-pulse" : isDone ? "bg-gray-200" : "bg-gray-100 text-gray-500"
                            }`}>
                              {slot.status}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm">No classes scheduled for today.</div>
                    )}
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="text-xl font-bold text-[#071D49] mb-4">Recent Activity & Grades</h2>
                  {isLoading ? (
                    <div className="text-center py-12 text-gray-500">Loading activity...</div>
                  ) : dashboard?.recentActivity?.length > 0 ? (
                    <div className="space-y-4">
                      {dashboard.recentActivity.map((act: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-3 rounded-lg border border-gray-100">
                          <div>
                            <p className="font-bold text-[#071D49]">{act.title || act.description}</p>
                            <p className="text-xs text-gray-500">{act.date ? new Date(act.date).toLocaleDateString() : ""}</p>
                          </div>
                          {act.score && (
                            <span className="px-2 py-1 text-xs font-bold rounded bg-green-100 text-green-800">
                              {act.score}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Report cards and recent assessment results will appear here.</p>
                    </div>
                  )}
                </Card>
              </div>
            </div>
            
          </div>
        </main>
      </div>
    </div>
  );
}
