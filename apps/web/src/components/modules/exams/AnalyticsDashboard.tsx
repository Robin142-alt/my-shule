"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Legend,
} from "recharts";
import { Card } from "@/components/ui/card";
import type { LiveExamsAnalyticsResponse } from "@/lib/modules/exams-client";

export function AnalyticsDashboard({
  liveData,
}: {
  liveData: LiveExamsAnalyticsResponse;
}) {
  if (!liveData) return null;

  return (
    <div className="space-y-6">
      {/* Performance Trends - Line Chart */}
      {liveData.trends && liveData.trends.length > 0 && (
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-base font-bold text-foreground">
              Performance Trends
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Average scores and pass rates across consecutive exam series.
            </p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={liveData.trends}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="exam_series_name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "var(--muted)" }}
                  dy={10}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "var(--muted)" }}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Line
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="average_score"
                  stroke="#0ea5e9"
                  strokeWidth={3}
                  activeDot={{ r: 6 }}
                  name="Average Score (%)"
                />
                <Line isAnimationActive={false} type="monotone" dataKey="pass_rate" stroke="#15803d" strokeWidth={2} name="Pass Rate (%)" />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Subject Performance - Bar Chart */}
      {liveData.subjectPerformance && liveData.subjectPerformance.length > 0 && (
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-base font-bold text-foreground">
              Subject Performance
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Detailed mean score by subject.
            </p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={liveData.subjectPerformance}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="subject_name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "var(--muted)" }}
                  dy={10}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "var(--muted)" }}
                  dx={-10}
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-muted)", opacity: 0.2 }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="mean_score"
                  fill="#0ea5e9"
                  radius={[4, 4, 0, 0]}
                  name="Mean Score (%)"
                  barSize={40}
                >
                  <LabelList
                    dataKey="mean_score"
                    position="top"
                    style={{ fill: "var(--muted)", fontSize: "12px" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
