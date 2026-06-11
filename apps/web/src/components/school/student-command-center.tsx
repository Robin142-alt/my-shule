"use client";

import { Calendar, BookOpen, GraduationCap, Award } from "lucide-react";
import { Card } from "@/components/ui/card";

export function StudentCommandCenter({ routeMode }: { routeMode?: "hosted" | "public" }) {
  return (
    <div className="min-h-screen bg-[#F3F6FA]">
      <div className="mx-auto max-w-7xl p-4 lg:p-6">
        
        {/* Main Content */}
        <main className="w-full">
          <div className="min-h-[calc(100vh-3rem)] rounded-2xl bg-white shadow-[0_2px_40px_rgba(7,29,73,0.04)] overflow-hidden">
            
            <header className="sticky top-0 z-20 border-b border-[#D8E0EC] bg-[#F3F6FA]/90 px-4 py-4 backdrop-blur sm:px-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#071D49] text-sm font-black text-white">MS</div>
                  <div>
                    <h1 className="text-2xl font-black text-[#071D49]">My Learner Portal</h1>
                    <p className="text-sm font-semibold text-[#64748B]">Grade 10 West • 2026 Term 2</p>
                  </div>
                </div>
              </div>
            </header>

            <div className="p-4 sm:p-8">
              <div className="grid gap-6 md:grid-cols-4 mb-8">
                <Card className="p-6 border-l-4 border-l-blue-500">
                  <div className="flex items-center gap-3 text-blue-600 mb-2">
                    <Calendar className="h-5 w-5" />
                    <span className="font-bold">Next Class</span>
                  </div>
                  <div className="text-2xl font-black text-[#071D49]">Mathematics</div>
                  <div className="text-sm font-semibold text-gray-500">09:00 AM • Room 104</div>
                </Card>

                <Card className="p-6 border-l-4 border-l-orange-500">
                  <div className="flex items-center gap-3 text-orange-600 mb-2">
                    <BookOpen className="h-5 w-5" />
                    <span className="font-bold">Assignments</span>
                  </div>
                  <div className="text-2xl font-black text-[#071D49]">2 Due Today</div>
                  <div className="text-sm font-semibold text-gray-500">Physics, History</div>
                </Card>

                <Card className="p-6 border-l-4 border-l-green-500">
                  <div className="flex items-center gap-3 text-green-600 mb-2">
                    <GraduationCap className="h-5 w-5" />
                    <span className="font-bold">Attendance</span>
                  </div>
                  <div className="text-2xl font-black text-[#071D49]">98%</div>
                  <div className="text-sm font-semibold text-gray-500">This Term</div>
                </Card>

                <Card className="p-6 border-l-4 border-l-purple-500">
                  <div className="flex items-center gap-3 text-purple-600 mb-2">
                    <Award className="h-5 w-5" />
                    <span className="font-bold">Latest Exam</span>
                  </div>
                  <div className="text-2xl font-black text-[#071D49]">85% (A)</div>
                  <div className="text-sm font-semibold text-gray-500">Mid-Term CAT 1</div>
                </Card>
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-[#071D49] mb-4">My Timetable (Today)</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div>
                        <div className="font-bold text-[#071D49]">08:00 AM - 09:00 AM</div>
                        <div className="text-sm text-gray-600">English Language</div>
                      </div>
                      <span className="px-2 py-1 bg-gray-200 text-xs font-bold rounded">Completed</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100">
                      <div>
                        <div className="font-bold text-blue-900">09:00 AM - 10:00 AM</div>
                        <div className="text-sm text-blue-700">Mathematics</div>
                      </div>
                      <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs font-bold rounded animate-pulse">Now</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                      <div>
                        <div className="font-bold text-gray-600">10:30 AM - 11:30 AM</div>
                        <div className="text-sm text-gray-500">Physics</div>
                      </div>
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded">Upcoming</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="text-xl font-bold text-[#071D49] mb-4">Recent Activity & Grades</h2>
                  <div className="text-center py-12 text-gray-500">
                    <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Report cards and recent assessment results will appear here.</p>
                  </div>
                </Card>
              </div>
            </div>
            
          </div>
        </main>
      </div>
    </div>
  );
}
